# Requirements Document

## Introduction

The Printing module provides comprehensive receipt and document printing capabilities for the SelfX Retail system. The system supports thermal printers (58mm, 80mm), laser/inkjet printers, and generates PDFs for email distribution. The architecture follows a three-transport model where Laravel generates print command plans but never connects directly to printer hardware. Physical printing is handled through the SelfX Print Agent (local binary), browser APIs (WebUSB/WebSerial/WebBluetooth), or the OS print dialog.

This specification covers the complete printing pipeline from sale completion through physical output, including ESC/POS command generation, template management, printer discovery and pairing, non-Latin text rasterization, and automatic print job execution.

## Glossary

- **Print_Agent**: Go binary listening on 127.0.0.1:27182 that communicates with physical printers via USB, Serial, Bluetooth, TCP 9100, or OS spooler
- **Command_Plan**: JSON structure containing printer commands compiled from block templates
- **Block_Template**: JSON document composed of block types (text, spacer, rule, columns, image, barcode, qr, feed, cut) that define document layout
- **ESC_POS**: Standard command language for thermal receipt printers
- **Transport**: Method by which print jobs reach printers (agent, browser_raw, browser_dialog)
- **Document_Kind**: Type of printable document (receipt, label, pick_list, delivery_note, invoice_pdf, report_pdf)
- **Print_Profile**: Configuration linking a store, document kind, and printer with layout preferences
- **Thermal_Printer**: Receipt printer using 58mm or 80mm thermal paper
- **Pairing**: Security process requiring 4-digit code exchange between Print_Agent and Laravel backend
- **Locked_Block**: Template block on tax documents that tenants cannot modify (invoice number, GSTIN, tax table)
- **Non_Latin_Text**: Text in Telugu, Hindi, or other scripts that require rasterization when printer lacks code page support
- **Drawer_Kick**: Command to open cash drawer connected to printer
- **Print_Job**: Database record tracking a document to be printed with status (queued, printed, failed)
- **Fixture_Data**: Sample data used for template preview without creating real transactions
- **Discovery**: Process of scanning for available printers via USB, network, or OS spooler
- **Heartbeat**: Periodic status check from paired Print_Agent indicating online/offline/paper_out status

## Requirements

### Requirement 1: Template Block System

**User Story:** As a store manager, I want to customize receipt layouts using visual blocks, so that receipts match my brand without writing code

#### Acceptance Criteria

1. THE Template_Compiler SHALL accept block-based JSON templates containing text, spacer, rule, columns, image, barcode, qr, feed, and cut block types
2. WHEN a template contains a text block, THE Template_Compiler SHALL support align (left, center, right), weight (regular, bold), size (sm, md, lg), and uppercase style properties
3. THE Template_Compiler SHALL validate that spacer and feed blocks specify integer line counts between 0 and 8 inclusive
4. THE Template_Compiler SHALL validate that cut blocks specify one of (none, partial, full) and appear only as the last block
5. THE Template_Compiler SHALL reject templates containing raw ESC/POS byte sequences with validation error
6. THE Template_Compiler SHALL reject templates containing script tags with validation error
7. THE Template_Compiler SHALL substitute template variables (store_name, sale_number, customer_name, line_items, total_amount, etc.) with actual transaction data
8. WHEN a template references undefined variables, THE Template_Compiler SHALL return validation error listing missing variables
9. THE Template_Parser SHALL produce identical block structure when parsing then serializing a valid template (round-trip property)
10. FOR ALL valid block templates, compiling then decompiling SHALL preserve block order and properties (idempotence property)

### Requirement 2: ESC/POS Command Generation

**User Story:** As a system developer, I want block templates compiled to ESC/POS commands, so that thermal printers render receipts correctly

#### Acceptance Criteria

1. THE ESC_POS_Driver SHALL compile block templates into valid ESC/POS command sequences using mike42/escpos-php library
2. THE ESC_POS_Driver SHALL emit GS V command for cut blocks (0x00 for full, 0x01 for partial)
3. THE ESC_POS_Driver SHALL emit ESC p command for drawer kick when profile specifies open_drawer_on equals cash and payment method equals cash
4. THE ESC_POS_Driver SHALL emit ESC a command for text alignment (0x00 left, 0x01 center, 0x02 right)
5. THE ESC_POS_Driver SHALL emit ESC E command for bold weight
6. WHEN barcode block specifies valid barcode data, THE ESC_POS_Driver SHALL emit GS k command with appropriate barcode type
7. WHEN qr block specifies valid data, THE ESC_POS_Driver SHALL emit QR code commands compatible with ESC/POS standard
8. THE ESC_POS_Driver SHALL validate that generated command sequences do not exceed 1MB per document
9. FOR ALL valid templates, THE ESC_POS_Driver SHALL produce command sequences that thermal printers can execute without error
10. THE ESC_POS_Driver SHALL never emit commands that were not explicitly generated from validated template blocks

### Requirement 3: Non-Latin Text Rasterization

**User Story:** As a store owner in India, I want receipts to display Telugu and Hindi text, so that customers receive documents in their preferred language

#### Acceptance Criteria

1. WHEN a template contains Telugu text, THE Print_Agent SHALL rasterize text to monochrome image using bundled Noto Sans Telugu font
2. WHEN a template contains Hindi text, THE Print_Agent SHALL rasterize text to monochrome image using bundled Noto Sans Devanagari font
3. WHEN a template contains Latin text, THE ESC_POS_Driver SHALL emit text commands without rasterization for performance
4. THE Print_Agent SHALL embed rasterized text images at correct line positions matching template block order
5. WHEN Print_Agent is unavailable and browser transport is used, THE Template_Compiler SHALL provide Latin fallback warning for non-Latin text
6. THE Print_Agent SHALL support Telugu, Hindi, and English locales as specified in template locale field
7. FOR ALL supported non-Latin scripts, rasterization quality SHALL be readable on 203 DPI thermal printers
8. THE Print_Agent SHALL cache font file data in memory for rasterization performance

### Requirement 4: Template Management

**User Story:** As a platform administrator, I want to manage default templates for all document types, so that tenants have professional receipts from day one

#### Acceptance Criteria

1. THE Template_Manager SHALL maintain platform default templates for receipt, label, pick_list, delivery_note, invoice_pdf, and report_pdf document kinds
2. THE Template_Manager SHALL allow Super Admin to edit platform default templates with preview using fixture data
3. THE Template_Manager SHALL prevent preview mode from creating print_jobs, sales, or invoices in database
4. WHEN a tenant owner edits a template, THE Template_Manager SHALL create tenant-specific override without modifying platform default
5. THE Template_Manager SHALL prevent tenant users from editing locked blocks (invoice_number, gstin, tax_table) on tax documents
6. WHEN a tenant override is deleted, THE Template_Manager SHALL fall back to platform default template
7. THE Template_Manager SHALL validate template JSON schema before saving
8. THE Template_Manager SHALL store template versions for audit and rollback capability
9. FOR ALL template edits, save then load SHALL return identical template content (persistence property)
10. THE Template_Manager SHALL enforce that GST invoice templates include mandatory locked blocks

### Requirement 5: Print Agent Core

**User Story:** As a cashier, I want receipts to print automatically after sale completion, so that I can serve customers quickly

#### Acceptance Criteria

1. THE Print_Agent SHALL listen on 127.0.0.1:27182 only and reject connections from other addresses
2. THE Print_Agent SHALL accept only HTTPS origins matching *.{APP_DOMAIN} pattern and local development wildcards
3. THE Print_Agent SHALL implement pairing flow requiring 4-digit code displayed in agent and entered in POS
4. WHEN pairing succeeds, THE Print_Agent SHALL store device token for subsequent authenticated requests
5. THE Print_Agent SHALL validate device token on every print request and return 401 for invalid tokens
6. WHEN Print_Agent receives POST /print with valid command plan, THE Print_Agent SHALL route job to appropriate transport (usb, serial, bluetooth, tcp, os_spooler)
7. THE Print_Agent SHALL return JSON response with status (spooled, printed, failed) within 2 seconds
8. THE Print_Agent SHALL send heartbeat status (online, offline, paper_out) to Laravel backend every 15 seconds
9. THE Print_Agent SHALL support Windows, macOS, and Linux operating systems with single compiled binary per platform
10. FOR ALL successful print jobs, THE Print_Agent SHALL not create duplicate print output when receiving same job_id multiple times (idempotence property)

### Requirement 6: Printer Discovery

**User Story:** As a store manager, I want to discover available printers, so that I can set up printing without technical knowledge

#### Acceptance Criteria

1. WHEN user clicks Scan in printer setup UI, THE Print_Agent SHALL enumerate printers from OS spooler (Windows Print Spooler and CUPS)
2. THE Print_Agent SHALL scan local subnet for TCP port 9100 devices with 200ms timeout per address when user initiates network scan
3. THE Print_Agent SHALL limit network scan to single /24 subnet to prevent excessive scanning
4. WHEN user grants WebUSB permission, THE Print_Agent SHALL call navigator.usb.getDevices() and return USB printer list
5. THE Print_Agent SHALL discover printers connected via Serial and Bluetooth interfaces when available
6. THE Print_Agent SHALL return discovery results as JSON array containing printer name, transport type, and connection details
7. THE Laravel_Backend SHALL never initiate network scans or connect to printer IP addresses
8. THE Discovery_Service SHALL cache discovered printer list for 5 minutes to reduce repeated scans
9. WHEN discovery finds zero printers, THE Discovery_Service SHALL return empty array without error
10. FOR ALL discovery scans, network scanning SHALL complete within 60 seconds or timeout gracefully

### Requirement 7: Printer Configuration

**User Story:** As a store manager, I want to assign specific printers to different document types, so that receipts and labels use appropriate printers

#### Acceptance Criteria

1. THE Printer_Registry SHALL store printer records with tenant_id, store_id, name, transport, connection_params, and status fields
2. THE Print_Profile SHALL link store_id, document_kind, and printer_id with layout preferences (cut, drawer_settings, orientation)
3. WHEN store has no print profile for document kind, THE Print_Job_Creator SHALL use platform default printer routing
4. THE Printer_Registry SHALL validate that transport is one of (agent, browser_raw, browser_dialog)
5. WHEN transport is agent, THE Printer_Registry SHALL require device_token from successful pairing
6. THE Print_Profile SHALL specify open_drawer_on setting (never, cash, all_payments)
7. THE Print_Job_Creator SHALL query print profile to determine target printer for given store and document kind
8. WHEN multiple printers are configured, THE Print_Profile SHALL allow different routing per document_kind (receipt to thermal, invoice to laser)
9. THE Printer_Registry SHALL mark printer status as active, inactive, or offline based on heartbeat status
10. FOR ALL print profile configurations, THE Print_Job_Creator SHALL select exactly one printer per document (deterministic routing property)

### Requirement 8: Print Job Creation and Queueing

**User Story:** As a developer, I want sale completion to automatically create print jobs, so that receipts generate without manual intervention

#### Acceptance Criteria

1. WHEN sale.completed event is dispatched, THE Printing_Listener SHALL create print_job record with kind equals receipt
2. THE Print_Job_Creator SHALL generate command plan by compiling template with sale transaction data
3. THE Print_Job_Creator SHALL store print_job with status queued, store_id, sale_id, cut setting, and drawer setting
4. THE Print_Job_Creator SHALL complete within 200ms for standard receipt templates
5. WHEN printer is offline at sale completion, THE Print_Job_Creator SHALL create queued job for later retry
6. THE Print_Job_Creator SHALL set job_id using UUID v7 for chronological sorting
7. THE Print_Job_Creator SHALL validate that sale belongs to tenant before creating print job
8. WHEN test print is requested, THE Print_Job_Creator SHALL create job with purpose equals test and no sale_id
9. THE Print_Job_Creator SHALL never block sale transaction from committing if print job creation fails
10. FOR ALL print jobs, creation SHALL be idempotent when using same idempotency_key (duplicate prevention property)

### Requirement 9: Print Job Execution

**User Story:** As a cashier, I want print jobs to execute automatically, so that I don't manually click print for every sale

#### Acceptance Criteria

1. THE POS_Client SHALL poll GET /print-jobs every 3 seconds to fetch queued jobs for current store
2. WHEN POS_Client receives queued jobs, THE POS_Client SHALL attempt delivery to paired Print_Agent
3. WHEN Print_Agent returns status printed, THE POS_Client SHALL call PUT /print-jobs/{job}/ack to mark job as printed
4. WHEN Print_Agent returns status failed, THE POS_Client SHALL display error notification and keep job as queued for retry
5. IF Print_Agent is unreachable, THE POS_Client SHALL attempt browser_raw transport using WebUSB/WebSerial/WebBluetooth
6. IF browser_raw fails or is unsupported, THE POS_Client SHALL fall back to browser_dialog transport (window.print)
7. THE POS_Client SHALL not attempt same job more than 3 times within 5 minutes to prevent repeated failures
8. THE Print_Job_Controller SHALL return 404 when acknowledging job belonging to different tenant
9. WHEN printer returns to online status after offline period, THE POS_Client SHALL retry all queued jobs for that printer
10. FOR ALL acknowledged print jobs, THE Backend SHALL accept acknowledgment exactly once per job_id (idempotence property)

### Requirement 10: Offline Printer Handling

**User Story:** As a cashier, I want sales to complete even when printer is offline, so that transactions don't fail due to printer issues

#### Acceptance Criteria

1. WHEN printer heartbeat shows status offline, THE Print_Job_Creator SHALL still create queued jobs
2. THE POS_Display SHALL show printer status chip with online, offline, or paper_out indicator
3. WHEN print job fails due to offline printer, THE POS_Client SHALL display notification without blocking sale completion
4. THE POS_Client SHALL maintain local queue of failed jobs in browser storage for retry
5. WHEN printer returns to online status, THE POS_Client SHALL automatically retry queued jobs
6. THE Cashier SHALL be able to manually trigger reprint of last receipt from POS interface
7. THE Reprint_Function SHALL fetch most recent printed or queued job for current shift and resend to printer
8. WHEN printer remains offline for 1 hour, THE Alert_Service SHALL notify store manager via notification system
9. THE Print_Job_Status SHALL transition from queued to printed only after successful acknowledgment from POS_Client
10. FOR ALL offline periods, print jobs SHALL queue without data loss (durability property)

### Requirement 11: Receipt Printing Integration

**User Story:** As a system integrator, I want sale transactions to trigger receipt printing, so that physical receipts match digital records

#### Acceptance Criteria

1. WHEN sale is completed with payment, THE Sale_Controller SHALL dispatch sale.completed event with sale_id
2. THE Printing_Listener SHALL consume sale.completed event and load sale with lines, customer, payments, and store details
3. THE Printing_Listener SHALL select receipt template based on print profile for store and receipt document kind
4. THE Printing_Listener SHALL compile template with sale data to generate receipt command plan
5. THE Printing_Listener SHALL create print_job record with generated command plan and status queued
6. THE Printing_Listener SHALL complete event handling within 100ms to avoid blocking sales queue
7. THE Printing_Listener SHALL handle missing sale gracefully without throwing exception
8. WHEN sale has customer attached, THE Printing_Listener SHALL include customer name and phone in receipt template variables
9. THE Printing_Listener SHALL calculate GST breakdown (CGST, SGST, IGST) and provide as template variables
10. FOR ALL completed sales, receipt print job creation SHALL succeed or fail without affecting sale persistence (isolation property)

### Requirement 12: Template Variable Substitution

**User Story:** As a template designer, I want to use variables in templates, so that receipts show actual transaction data

#### Acceptance Criteria

1. THE Template_Compiler SHALL recognize variable syntax {{variable_name}} in template text blocks
2. THE Template_Compiler SHALL substitute {{store_name}} with store.name from database
3. THE Template_Compiler SHALL substitute {{sale_number}} with sale.number formatted as display value
4. THE Template_Compiler SHALL substitute {{created_at}} with sale.created_at formatted per locale
5. THE Template_Compiler SHALL substitute {{line_items}} by iterating sale_lines and formatting with qty, name, unit_price, line_total
6. THE Template_Compiler SHALL substitute {{subtotal}}, {{tax_total}}, {{discount}}, {{grand_total}} with formatted currency values
7. THE Template_Compiler SHALL substitute {{payment_method}} with localized payment method name
8. THE Template_Compiler SHALL substitute {{customer_name}} and {{customer_phone}} when sale has customer attached
9. WHEN variable is undefined, THE Template_Compiler SHALL replace with empty string or configured fallback value
10. FOR ALL variable substitutions, THE Template_Compiler SHALL escape special characters to prevent command injection

### Requirement 13: Barcode and QR Code Generation

**User Story:** As a store owner, I want receipts to include QR codes for digital verification, so that customers can validate their purchase online

#### Acceptance Criteria

1. WHEN template contains barcode block with data, THE ESC_POS_Driver SHALL emit GS k command with barcode type CODE128, EAN13, or CODE39
2. THE ESC_POS_Driver SHALL validate barcode data matches selected barcode type format
3. WHEN template contains qr block with data, THE ESC_POS_Driver SHALL emit ESC/POS QR code command sequence
4. THE ESC_POS_Driver SHALL default QR error correction level to M (medium) when not specified
5. THE ESC_POS_Driver SHALL validate QR data does not exceed 2953 bytes (maximum for QR version 40)
6. WHEN barcode or QR generation fails, THE ESC_POS_Driver SHALL return validation error before creating print job
7. THE Template_Variable_Substitution SHALL populate barcode/QR data variables with sale_number, transaction_id, or verification_url
8. THE ESC_POS_Driver SHALL emit size commands for barcode height and QR module size matching template specifications
9. WHEN printer does not support QR codes, THE Print_Agent SHALL fallback to rasterized QR image
10. FOR ALL barcode and QR blocks, generated codes SHALL scan correctly using standard barcode readers (readability property)

### Requirement 14: Cash Drawer Control

**User Story:** As a cashier, I want the cash drawer to open automatically on cash sales, so that I can make change efficiently

#### Acceptance Criteria

1. WHEN sale has payment_method equals cash and print profile specifies open_drawer_on includes cash, THE ESC_POS_Driver SHALL emit ESC p m t1 t2 drawer kick command
2. THE ESC_POS_Driver SHALL emit drawer kick command before cut command in ESC/POS sequence
3. THE Print_Profile SHALL validate open_drawer_on is one of (never, cash, all_payments)
4. WHEN sale has payment_method equals upi or card and open_drawer_on equals never, THE ESC_POS_Driver SHALL not emit drawer kick command
5. WHEN sale has payment_method equals upi and open_drawer_on equals all_payments, THE ESC_POS_Driver SHALL emit drawer kick command
6. THE ESC_POS_Driver SHALL default drawer kick pulse duration to 120ms when not configured
7. THE Drawer_Command SHALL use pin 0 (m=0) or pin 1 (m=1) based on printer connection (default pin 0)
8. WHEN template explicitly includes drawer kick block, THE ESC_POS_Driver SHALL emit command regardless of payment method
9. THE Print_Agent SHALL validate that only ESC_POS_Driver can emit drawer kick commands (not user-provided bytes)
10. FOR ALL cash sales with open_drawer_on equals cash, drawer SHALL open exactly once per receipt (idempotence property)

### Requirement 15: PDF Generation for Email and Reports

**User Story:** As a store manager, I want to email PDF receipts to customers, so that they have digital records

#### Acceptance Criteria

1. WHEN receipt email is requested, THE PDF_Renderer SHALL compile receipt template to HTML
2. THE PDF_Renderer SHALL use spatie/laravel-pdf library to convert HTML to PDF
3. THE PDF_Renderer SHALL queue PDF generation on reports queue worker
4. THE PDF_Renderer SHALL store generated PDF in S3 with path invoices/{tenant_id}/{sale_id}.pdf
5. THE PDF_Renderer SHALL return PDF URL with 7-day signed expiration for customer access
6. THE PDF_Renderer SHALL apply CSS styles for A4 or letter paper size matching region preference
7. WHEN report export is requested, THE PDF_Renderer SHALL compile report template with dataset and generate PDF
8. THE PDF_Renderer SHALL validate that PDF generation does not exceed 30 second timeout
9. THE PDF_Renderer SHALL handle template images by embedding base64 or referencing accessible URLs
10. FOR ALL PDF generations, rendered document SHALL match template layout when opened in standard PDF readers (consistency property)

### Requirement 16: Printer Pairing Security

**User Story:** As a system administrator, I want printer pairing to be secure, so that unauthorized devices cannot create print jobs

#### Acceptance Criteria

1. WHEN Print_Agent starts, THE Print_Agent SHALL generate random 4-digit pairing code displayed in agent UI
2. THE Pairing_Flow SHALL require cashier to enter 4-digit code in POS printer setup within 5 minutes
3. WHEN POS submits pairing code, THE Backend SHALL validate code matches active pairing request for agent
4. WHEN pairing succeeds, THE Backend SHALL generate device_token using secure random UUID and return to POS
5. THE POS_Client SHALL store device_token in browser localStorage for subsequent print requests
6. THE Print_Agent SHALL validate device_token on every /print request and reject invalid tokens with 401 status
7. THE Pairing_Code SHALL expire after 5 minutes or successful pairing, whichever comes first
8. THE Backend SHALL store device_token association with store_id and printer_id in printers table
9. WHEN device_token is revoked, THE Print_Agent SHALL reject print requests with that token
10. FOR ALL pairing attempts, THE Backend SHALL rate limit to 5 attempts per IP address per hour (brute force protection)

### Requirement 17: Multi-Store Printer Routing

**User Story:** As a multi-store owner, I want each store to use its own configured printers, so that locations operate independently

#### Acceptance Criteria

1. THE Print_Job_Creator SHALL filter available printers by store_id matching current sale store
2. WHEN print profile specifies printer for store and document kind, THE Print_Job_Creator SHALL route job to that printer
3. THE POS_Client SHALL only poll for print jobs where job.store_id matches POS terminal store_id
4. THE Print_Job_Controller SHALL return 404 when POS attempts to acknowledge job from different store
5. THE Printer_Registry SHALL allow same physical printer to be configured for multiple stores if owner approves
6. WHEN store has no configured printer, THE Print_Job_Creator SHALL use organization default printer if configured
7. THE Print_Profile SHALL enforce that receipt printer and label printer can be different printers per store
8. THE Discovery_Service SHALL allow store managers to see only printers configured for their store
9. THE Heartbeat_Service SHALL track printer status per store association
10. FOR ALL print jobs, THE Backend SHALL enforce tenant_id and store_id isolation (no cross-tenant printing property)

### Requirement 18: Template Preview with Fixture Data

**User Story:** As a template editor, I want to preview templates with sample data, so that I can see changes before publishing

#### Acceptance Criteria

1. WHEN user clicks Preview in template editor, THE Template_Previewer SHALL load fixture data for document kind
2. THE Template_Previewer SHALL compile template with fixture data using same Template_Compiler as production
3. THE Template_Previewer SHALL validate that preview mode writes zero database rows to print_jobs, sales, or invoices
4. THE Template_Previewer SHALL return rendered HTML preview for display in browser
5. THE Template_Previewer SHALL indicate in preview that fixture data is being used with watermark or label
6. THE Fixture_Data SHALL include representative values for all standard template variables
7. WHEN template contains errors, THE Template_Previewer SHALL display validation errors without saving template
8. THE Template_Previewer SHALL allow Super Admin to customize fixture data values per document kind
9. THE Template_Previewer SHALL render preview within 1 second for standard templates
10. FOR ALL preview generations, database state SHALL be identical before and after preview (no side effects property)

### Requirement 19: Test Print Functionality

**User Story:** As a store manager, I want to send test prints, so that I can verify printer configuration is working

#### Acceptance Criteria

1. WHEN user clicks Test Print in printer setup, THE Print_Job_Creator SHALL create print_job with purpose equals test
2. THE Test_Print SHALL use configured template for receipt document kind with fixture data
3. THE Test_Print_Job SHALL write to print_jobs table with status queued and purpose test for auditability
4. THE Test_Print SHALL include test watermark or header indicating this is a test document
5. THE Test_Print SHALL exercise drawer kick if profile specifies open_drawer_on is not never
6. THE POS_Client SHALL execute test print job using same transport as production jobs
7. WHEN test print succeeds, THE Printer_Setup_UI SHALL display success confirmation with green indicator
8. WHEN test print fails, THE Printer_Setup_UI SHALL display specific error message (offline, paper_out, connection_failed)
9. THE Test_Print_Flow SHALL complete within 10 seconds including printer execution time
10. FOR ALL test prints, THE Backend SHALL enforce same tenant and store isolation as production print jobs

### Requirement 20: Print Job History and Auditing

**User Story:** As a store manager, I want to see print job history, so that I can troubleshoot failed prints and verify activity

#### Acceptance Criteria

1. THE Print_Job_Table SHALL retain records for queued, printed, and failed jobs for 90 days
2. THE Print_Job_History_API SHALL return paginated list filtered by store_id, status, kind, and date_range
3. THE Print_Job_Record SHALL store job_id, tenant_id, store_id, kind, sale_id, status, created_at, updated_at, and failure_reason
4. WHEN print job fails, THE Print_Agent SHALL return failure_reason (offline, paper_out, usb_error, timeout) for storage
5. THE Print_Job_History_UI SHALL display failure_reason to help managers diagnose printer issues
6. THE Print_Job_History_API SHALL include reprint action for failed or printed jobs
7. THE Audit_System SHALL log template edits, printer configuration changes, and pairing events
8. THE Print_Job_Metrics SHALL track success_rate per printer for reliability monitoring
9. THE Print_Job_History_API SHALL enforce tenant_id filtering to prevent cross-tenant job visibility
10. FOR ALL print job history queries, results SHALL be ordered by created_at descending (newest first)

### Requirement 21: Template Editor UI

**User Story:** As a store manager, I want a visual template editor, so that I can customize receipts without technical knowledge

#### Acceptance Criteria

1. THE Template_Editor_UI SHALL display block list with drag-and-drop reordering capability
2. THE Template_Editor_UI SHALL provide Add Block menu with all supported block types
3. WHEN user selects text block, THE Template_Editor_UI SHALL show properties panel for align, weight, size, uppercase, and content
4. WHEN user selects image block, THE Template_Editor_UI SHALL allow image upload with preview
5. THE Template_Editor_UI SHALL provide variable picker showing available variables for selected document kind
6. THE Template_Editor_UI SHALL show live preview pane updating as blocks are edited
7. THE Template_Editor_UI SHALL validate template on save and display validation errors inline
8. THE Template_Editor_UI SHALL disable editing of locked blocks on tax documents for tenant users
9. THE Template_Editor_UI SHALL allow Save Draft and Publish actions with version history
10. FOR ALL template edits, THE Template_Editor_UI SHALL preserve user changes in draft until explicitly published

### Requirement 22: Label Printing for Inventory

**User Story:** As a store manager, I want to print product labels with barcodes, so that I can label inventory items

#### Acceptance Criteria

1. WHEN user selects products and clicks Print Labels, THE Print_Job_Creator SHALL create print_job with kind equals label
2. THE Label_Template SHALL support 40mm x 30mm and 50mm x 25mm label sizes
3. THE Label_Template SHALL include product name, price, barcode, and SKU in configured layout
4. THE ESC_POS_Driver SHALL emit appropriate formatting for label printer paper width
5. THE Print_Profile SHALL allow store to configure label printer separate from receipt printer
6. THE Label_Batch_Print SHALL create one print job containing all selected products with page breaks
7. THE Label_Template SHALL support QR codes containing product URLs for inventory management apps
8. WHEN label printer is offline, THE Print_Job SHALL queue for retry like receipt jobs
9. THE Label_Print_UI SHALL show preview of label layout before printing batch
10. FOR ALL label print jobs, barcode SHALL match product.barcode in database (data integrity property)

### Requirement 23: System Printer Driver Support

**User Story:** As a store manager, I want to print to regular office printers, so that I can use existing equipment

#### Acceptance Criteria

1. THE System_Driver SHALL convert block templates to HTML suitable for standard printers
2. THE System_Driver SHALL apply CSS for A4 or letter paper size based on regional preference
3. THE System_Driver SHALL send HTML to OS spooler via Print_Agent using system print command
4. THE System_Driver SHALL support Windows Print Spooler and CUPS on Linux/macOS
5. WHEN System_Driver is used, THE Template_Compiler SHALL ignore thermal-specific settings (paper_width, cut)
6. THE System_Driver SHALL render barcode and QR blocks as printable images
7. THE Print_Profile SHALL allow store to select driver type (escpos, system, epson_epos, star_webprnt, sdk)
8. WHEN driver is system, THE Print_Agent SHALL enumerate available OS printers for selection
9. THE System_Driver SHALL validate that generated HTML renders correctly in browser print preview
10. FOR ALL system driver print jobs, output SHALL match template layout on standard 8.5x11 or A4 paper

### Requirement 24: Network Printer Support

**User Story:** As a store manager, I want to print to network printers via TCP, so that printers can be shared across terminals

#### Acceptance Criteria

1. WHEN printer transport is tcp_9100, THE Print_Agent SHALL open TCP socket to configured IP address and port 9100
2. THE Print_Agent SHALL send raw ESC/POS command bytes to TCP socket
3. THE Print_Agent SHALL set TCP socket timeout to 5 seconds for connection and 10 seconds for write
4. WHEN TCP connection fails, THE Print_Agent SHALL return failure_reason tcp_connection_failed
5. THE Discovery_Service SHALL scan local /24 subnet for open port 9100 when user clicks Scan Network
6. THE Printer_Registry SHALL store TCP printer with ip_address and port in connection_params JSON field
7. THE Print_Agent SHALL support multiple concurrent TCP connections to different printers
8. THE Network_Printer_Config SHALL validate IP address is valid IPv4 format
9. WHEN network printer is unreachable, THE Print_Agent SHALL fail print job within timeout period
10. FOR ALL TCP print jobs, THE Print_Agent SHALL close socket after print completion or timeout (resource cleanup property)

### Requirement 25: Browser-Based Printing Fallback

**User Story:** As a cashier, I want receipts to print via browser when agent is unavailable, so that I can complete sales

#### Acceptance Criteria

1. WHEN Print_Agent is unreachable, THE POS_Client SHALL attempt browser_raw transport using WebUSB
2. THE POS_Client SHALL request USB device access using navigator.usb.requestDevice() after user gesture
3. WHEN WebUSB connects to printer, THE POS_Client SHALL send raw ESC/POS bytes to USB interface
4. IF WebUSB fails or is unsupported, THE POS_Client SHALL attempt WebSerial for serial printers
5. IF WebBluetooth is available, THE POS_Client SHALL allow pairing with Bluetooth thermal printers
6. IF browser_raw fails, THE POS_Client SHALL fall back to browser_dialog using window.print()
7. WHEN browser_dialog is used, THE POS_Client SHALL render receipt as HTML in new window and trigger print dialog
8. THE POS_Client SHALL display user instructions for granting USB permissions when required
9. THE Browser_Transport SHALL work in Chrome and Edge browsers (WebUSB supported browsers)
10. FOR ALL browser transports, THE POS_Client SHALL maintain same command plan format as agent transport (consistency property)

### Requirement 26: Printer Status Monitoring

**User Story:** As a cashier, I want to see printer status in real-time, so that I know if printer issues need attention

#### Acceptance Criteria

1. THE Print_Agent SHALL send heartbeat HTTP POST to Laravel backend every 15 seconds
2. THE Heartbeat_Payload SHALL include device_token, status (online, offline, paper_out), and timestamp
3. THE Backend SHALL update printer status in printers table based on heartbeat data
4. WHEN heartbeat is missed for 45 seconds, THE Backend SHALL mark printer status as offline
5. THE POS_Display SHALL show printer status chip with color indicator (green online, red offline, yellow paper_out)
6. WHEN printer status changes, THE POS_Client SHALL display toast notification
7. THE Printer_Status_API SHALL return current status for all printers configured for store
8. WHEN paper_out status is detected, THE Alert_Service SHALL notify store staff via notification system
9. THE Heartbeat_Service SHALL store last_heartbeat_at timestamp for monitoring printer connectivity
10. FOR ALL heartbeat updates, THE Backend SHALL accept status updates only from authenticated Print_Agent with valid device_token

### Requirement 27: Multi-Language Support

**User Story:** As a store owner, I want receipts in customer's preferred language, so that customers can read their receipts

#### Acceptance Criteria

1. THE Template_System SHALL support locale field with values en, te, hi (English, Telugu, Hindi)
2. WHEN template locale is te, THE Template_Compiler SHALL use Telugu translations for standard labels
3. WHEN template locale is hi, THE Template_Compiler SHALL use Hindi translations for standard labels
4. THE Translation_System SHALL provide translations for common labels (Total, Subtotal, Tax, Discount, Payment_Method)
5. THE Store_Settings SHALL allow store manager to set default_locale for receipts
6. WHEN sale has customer with preferred_locale, THE Print_Job_Creator SHALL use customer locale over store default
7. THE Template_Variable SHALL format currency according to locale (₹1,234.56 for INR)
8. THE Template_Variable SHALL format dates according to locale date format
9. THE Template_Editor SHALL allow separate templates per locale for same document kind
10. FOR ALL supported locales, translations SHALL be provided by native speakers for accuracy (quality property)

### Requirement 28: Pick List and Delivery Note Printing

**User Story:** As a warehouse staff member, I want to print pick lists for online orders, so that I can efficiently pack orders

#### Acceptance Criteria

1. WHEN order status changes to accepted, THE Print_Job_Creator SHALL create print_job with kind equals pick_list if configured
2. THE Pick_List_Template SHALL include order number, customer name, items with quantities, and storage locations
3. THE Pick_List_Template SHALL support checkbox blocks for staff to mark items as picked
4. WHEN order transitions to out_for_delivery, THE Print_Job_Creator SHALL create print_job with kind equals delivery_note
5. THE Delivery_Note_Template SHALL include customer address, phone, delivery instructions, and order items
6. THE Print_Profile SHALL allow routing pick_list to warehouse printer and delivery_note to delivery printer
7. THE Pick_List_Job SHALL not open cash drawer regardless of payment method
8. THE Delivery_Note SHALL include QR code linking to delivery tracking page
9. THE Print_Job_Creator SHALL support batch printing of multiple pick lists for efficiency
10. FOR ALL pick list and delivery note jobs, document SHALL contain accurate order data at time of printing (consistency property)

### Requirement 29: Template Version Control

**User Story:** As a store manager, I want template version history, so that I can revert to previous versions if needed

#### Acceptance Criteria

1. WHEN template is saved, THE Template_Manager SHALL create version record with template content snapshot
2. THE Template_Version SHALL store version_number, template_content, edited_by_user_id, and created_at timestamp
3. THE Template_Manager SHALL auto-increment version_number for each save of same template
4. THE Template_History_UI SHALL display version list with version number, date, and edited by user name
5. WHEN user clicks Revert on template version, THE Template_Manager SHALL load version content as new draft
6. THE Template_Manager SHALL never delete version records (append-only history)
7. THE Template_Audit SHALL include version number in audit log entries for compliance
8. THE Template_Comparison_UI SHALL show diff between current and selected previous version
9. THE Template_Manager SHALL retain all versions for minimum 1 year for regulatory compliance
10. FOR ALL template saves, THE Template_Manager SHALL create version record atomically with template save (transactional property)

### Requirement 30: Printing Module API Security

**User Story:** As a security engineer, I want printing APIs to be secure, so that unauthorized users cannot create or access print jobs

#### Acceptance Criteria

1. THE Print_Job_Controller SHALL validate tenant_id from session matches print_job.tenant_id before returning job
2. THE Print_Job_Controller SHALL validate store_id from user permissions matches print_job.store_id for all operations
3. THE Print_Job_Controller SHALL enforce permission printing.printers.manage for printer configuration endpoints
4. THE Print_Job_Controller SHALL enforce permission printing.templates.edit for template modification endpoints
5. THE Print_Job_Controller SHALL enforce permission printing.test for test print operations
6. THE Print_Job_Controller SHALL rate limit print job creation to 100 jobs per minute per store
7. THE Template_Controller SHALL reject template content containing script tags to prevent XSS
8. THE Template_Controller SHALL reject template content containing raw ESC/POS bytes to prevent command injection
9. THE Print_Agent SHALL validate origin header matches allowed patterns before accepting print requests
10. FOR ALL printing API endpoints, THE Backend SHALL return 403 when user lacks required permission (authorization property)

## Technical Constraints

### Database Schema

- MUST create `document_templates` table with columns: id (uuid), tenant_id (uuid, nullable for platform defaults), kind (enum: receipt, label, pick_list, delivery_note, invoice_pdf, report_pdf), locale (enum: en, te, hi), content (jsonb), version (integer), is_locked (boolean), created_by (uuid), created_at, updated_at
- MUST create `printers` table with columns: id (uuid), tenant_id (uuid), store_id (uuid), name (string), transport (enum: agent, browser_raw, browser_dialog), driver (enum: escpos, system, epson_epos, star_webprnt, sdk), connection_params (jsonb), device_token (string, nullable), status (enum: online, offline, paper_out), last_heartbeat_at (timestamp), created_at, updated_at
- MUST create `print_profiles` table with columns: id (uuid), store_id (uuid), document_kind (enum), printer_id (uuid), template_id (uuid, nullable for platform default), open_drawer_on (enum: never, cash, all_payments), orientation (enum: portrait, landscape), created_at, updated_at
- MUST add index on print_jobs(store_id, status) for efficient polling
- MUST add index on document_templates(tenant_id, kind, locale) for template lookup
- MUST add index on printers(store_id, status) for status queries
- MUST use jsonb columns for flexible command_plan and connection_params storage

### Technology Stack

- MUST use mike42/escpos-php library for ESC/POS command generation
- MUST use spatie/laravel-pdf for PDF rendering from HTML
- MUST implement Print_Agent in Go for cross-platform single binary distribution
- MUST use Noto Sans Telugu and Noto Sans Devanagari fonts bundled in Print_Agent for non-Latin text
- MUST support WebUSB, WebSerial, and WebBluetooth browser APIs for browser_raw transport
- MUST use UUID v7 for print_job IDs to maintain chronological order
- MUST use Laravel Events for sale.completed → print job creation integration

### Performance Requirements

- Template compilation MUST complete within 200ms for standard receipts
- Print job creation MUST not block sale transaction commit
- Preview generation MUST complete within 1 second
- Test print flow MUST complete within 10 seconds end-to-end
- POS polling MUST occur every 3 seconds without excessive backend load
- Network printer discovery MUST timeout within 60 seconds
- PDF generation MUST complete within 30 seconds or timeout gracefully

### Security Requirements

- Laravel backend MUST never connect to printer IP addresses (security boundary)
- Print_Agent MUST listen only on 127.0.0.1 (no external exposure)
- Print_Agent MUST validate origin header matches *.{APP_DOMAIN} pattern
- Pairing codes MUST expire after 5 minutes
- Device tokens MUST be validated on every Print_Agent request
- Template content MUST be validated to reject script tags and raw byte injection
- Print job access MUST enforce tenant_id and store_id isolation
- Printer configuration APIs MUST require appropriate permissions

### Operational Requirements

- Print jobs MUST be retained for 90 days for troubleshooting
- Template versions MUST be retained for 1 year minimum for compliance
- Print_Agent MUST send heartbeat every 15 seconds
- Printer offline threshold MUST be 45 seconds (3 missed heartbeats)
- Failed print jobs MUST be retryable without manual intervention
- System MUST queue print jobs when printer offline for later execution
- Alert notifications MUST trigger when printer offline for 1 hour
- Print success rate MUST exceed 99% under normal operating conditions
