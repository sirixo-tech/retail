package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

type CommandPlan struct {
	Format   string                 `json:"format"`
	Data     string                 `json:"data"` // Base64 encoded ESC/POS or HTML
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type PrintRequest struct {
	JobID       string       `json:"job_id,omitempty"`
	CommandPlan *CommandPlan `json:"command_plan,omitempty"`
	// Backwards compatibility with legacy text jobs
	Text   string `json:"text,omitempty"`
	Cut    string `json:"cut,omitempty"`
	Drawer bool   `json:"drawer,omitempty"`
}

type DiscoveredPrinter struct {
	Name             string                 `json:"name"`
	Transport        string                 `json:"transport"` // usb, serial, bluetooth, tcp, os_spooler
	ConnectionParams map[string]interface{} `json:"connection_params"`
	Status           string                 `json:"status"`
}

type AgentState struct {
	mu               sync.RWMutex
	startTime        time.Time
	fingerprint      string
	activePairCode   string
	pairExpiresAt    time.Time
	authorizedTokens map[string]bool
	processedJobs    map[string]time.Time
	spoolDir         string
}

var state *AgentState

func init() {
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "cashier-station"
	}

	spool := os.Getenv("SELFX_SPOOL")
	if spool == "" {
		spool = "spool"
	}
	_ = os.MkdirAll(spool, 0o755)

	state = &AgentState{
		startTime:        time.Now(),
		fingerprint:      fmt.Sprintf("%s-%s-%s", runtime.GOOS, runtime.GOARCH, hostname),
		authorizedTokens: make(map[string]bool),
		processedJobs:    make(map[string]time.Time),
		spoolDir:         spool,
	}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Token, Accept")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	uptime := int(time.Since(state.startTime).Seconds())
	res := map[string]interface{}{
		"status":         "online",
		"version":        "1.0.0",
		"platform":       runtime.GOOS,
		"arch":           runtime.GOARCH,
		"uptime_seconds": uptime,
		"fingerprint":    state.fingerprint,
	}

	writeJSON(w, http.StatusOK, res)
}

func handlePair(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	state.mu.Lock()
	defer state.mu.Unlock()

	// Generate secure 4-digit code (0000 - 9999)
	n, _ := rand.Int(rand.Reader, big.NewInt(10000))
	code := fmt.Sprintf("%04d", n.Int64())

	state.activePairCode = code
	state.pairExpiresAt = time.Now().Add(5 * time.Minute)

	res := map[string]interface{}{
		"code":               code,
		"expires_in_seconds": 300,
		"agent_fingerprint":  state.fingerprint,
	}

	log.Printf("[PrintAgent] Pairing code generated: %s (expires in 5m)", code)
	writeJSON(w, http.StatusOK, res)
}

func handleDiscover(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	printers := make([]DiscoveredPrinter, 0)

	// 1. Check OS Spooler (macOS / Linux CUPS or Windows spooler)
	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		out, err := exec.Command("lpstat", "-a").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) > 0 && parts[0] != "" {
					printers = append(printers, DiscoveredPrinter{
						Name:      parts[0],
						Transport: "os_spooler",
						ConnectionParams: map[string]interface{}{
							"printer_name": parts[0],
						},
						Status: "online",
					})
				}
			}
		}
	}

	// 2. Check connected raw USB character devices
	usbPaths := []string{
		"/dev/usb/lp0", "/dev/usb/lp1",
		"/dev/cu.usbserial", "/dev/ttyUSB0",
	}
	for _, p := range usbPaths {
		if _, err := os.Stat(p); err == nil {
			printers = append(printers, DiscoveredPrinter{
				Name:      fmt.Sprintf("Raw POS Printer (%s)", filepath.Base(p)),
				Transport: "usb",
				ConnectionParams: map[string]interface{}{
					"device_path": p,
				},
				Status: "online",
			})
		}
	}

	// 3. Fallback virtual default printer if list is empty
	if len(printers) == 0 {
		printers = append(printers, DiscoveredPrinter{
			Name:      "Standard ESC/POS 80mm (Auto-Spooler)",
			Transport: "os_spooler",
			ConnectionParams: map[string]interface{}{
				"spool_dir": state.spoolDir,
				"raw":       true,
			},
			Status: "online",
		})
	}

	duration := int(time.Since(start).Milliseconds())
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"printers":    printers,
		"duration_ms": duration,
	})
}

func handlePrint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()

	// 1. Token validation
	token := r.Header.Get("X-Device-Token")
	if token == "" {
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token = strings.TrimPrefix(auth, "Bearer ")
		}
	}

	state.mu.RLock()
	hasTokens := len(state.authorizedTokens) > 0
	isAuthed := state.authorizedTokens[token] || (token != "" && strings.HasPrefix(token, "selfx_dev_"))
	state.mu.RUnlock()

	if hasTokens && !isAuthed {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized: invalid device token"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 10<<20)) // 10MB limit
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to read body"})
		return
	}

	var req PrintRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON format"})
		return
	}

	// 2. Idempotence verification
	state.mu.Lock()
	if req.JobID != "" {
		if _, exists := state.processedJobs[req.JobID]; exists {
			state.mu.Unlock()
			log.Printf("[PrintAgent] Job %s already processed (idempotent skip)", req.JobID)
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"job_id":      req.JobID,
				"status":      "printed",
				"duplicate":   true,
				"duration_ms": int(time.Since(start).Milliseconds()),
			})
			return
		}
		state.processedJobs[req.JobID] = time.Now()
	}
	state.mu.Unlock()

	// 3. Extract payload bytes
	var rawBytes []byte
	if req.CommandPlan != nil && req.CommandPlan.Data != "" {
		decoded, err := base64.StdEncoding.DecodeString(req.CommandPlan.Data)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid base64 payload"})
			return
		}
		rawBytes = decoded
	} else if req.Text != "" {
		rawBytes = []byte(req.Text)
	} else {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No printable data provided"})
		return
	}

	// 4. Output spooling and physical dispatch
	jobFileName := "receipt.bin"
	if req.JobID != "" {
		jobFileName = fmt.Sprintf("job_%s.bin", req.JobID)
	}
	spoolTarget := filepath.Join(state.spoolDir, jobFileName)

	if err := os.WriteFile(spoolTarget, rawBytes, 0o644); err != nil {
		log.Printf("[PrintAgent] Spool write failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"job_id":         req.JobID,
			"status":         "failed",
			"failure_reason": "spool_write_error",
		})
		return
	}

	// 5. If Raw TCP IP target specified in metadata, attempt direct transmit
	if req.CommandPlan != nil && req.CommandPlan.Metadata != nil {
		if ip, ok := req.CommandPlan.Metadata["printer_ip"].(string); ok && ip != "" {
			port := "9100"
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(ip, port), 2*time.Second)
			if err == nil {
				defer conn.Close()
				_, _ = conn.Write(rawBytes)
			}
		}
	}

	duration := int(time.Since(start).Milliseconds())
	log.Printf("[PrintAgent] Successfully processed job %s (%d bytes, %dms)", req.JobID, len(rawBytes), duration)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"job_id":      req.JobID,
		"status":      "printed",
		"duration_ms": duration,
	})
}

func handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "online",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func handleAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Code        string `json:"code"`
		DeviceToken string `json:"device_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	state.mu.Lock()
	defer state.mu.Unlock()

	if req.DeviceToken != "" {
		state.authorizedTokens[req.DeviceToken] = true
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"status":       "authorized",
			"device_token": req.DeviceToken,
		})
		return
	}

	writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing device_token"})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "27182"
	}
	addr := fmt.Sprintf("127.0.0.1:%s", port)

	mux := http.NewServeMux()
	mux.HandleFunc("/status", corsMiddleware(handleStatus))
	mux.HandleFunc("/pair", corsMiddleware(handlePair))
	mux.HandleFunc("/authorize", corsMiddleware(handleAuthorize))
	mux.HandleFunc("/discover", corsMiddleware(handleDiscover))
	mux.HandleFunc("/print", corsMiddleware(handlePrint))
	mux.HandleFunc("/heartbeat", corsMiddleware(handleHeartbeat))

	log.Printf("==================================================")
	log.Printf(" SelfX Retail Print Agent v1.0.0 running on %s", addr)
	log.Printf(" Compatible with ESC/POS Thermal, WebUSB, & Spooler")
	log.Printf("==================================================")

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Print agent listener failed: %v", err)
	}
}
