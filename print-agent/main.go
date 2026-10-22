package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

type job struct {
	Text   string `json:"text"`
	Cut    string `json:"cut"`
	Drawer bool   `json:"drawer"`
}

func main() {
	dir := os.Getenv("SELFX_SPOOL")
	if dir == "" {
		dir = "spool"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatal(err)
	}
	http.HandleFunc("/print", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "read", http.StatusBadRequest)
			return
		}
		var payload job
		if err := json.Unmarshal(body, &payload); err != nil || payload.Text == "" {
			http.Error(w, "json", http.StatusBadRequest)
			return
		}
		name := filepath.Join(dir, "receipt.txt")
		if err := os.WriteFile(name, body, 0o644); err != nil {
			http.Error(w, "spool", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"spooled"}`))
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:27182", nil))
}
