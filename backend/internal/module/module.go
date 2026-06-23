// Package module loads and exposes the module manifest (kentos.module.json).
// Every app built from this template is a "module": it declares its identity
// (name, icon, roles, …) in the manifest. The manifest lives next to this
// package and is embedded into the binary (go:embed) — the single source of
// truth — and served at /api/<apiVersion>/<name>/metadata.
package module

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed kentos.module.json
var manifest []byte

// Load parses the embedded module manifest. This is the single source of truth
// for the module's identity; edit kentos.module.json in this directory (or use
// the init-module skill) to change it.
func Load() (*Module, error) {
	return Parse(manifest)
}

// Module is the parsed view of kentos.module.json. Raw holds the original bytes
// so the metadata endpoint can serve the manifest verbatim, including any extra
// fields not modelled here.
type Module struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName"`
	Description string   `json:"description"`
	Version     string   `json:"version"`
	Icon        string   `json:"icon"`
	Address     string   `json:"address"`
	Roles       []string `json:"roles"`
	API         struct {
		Version string `json:"version"`
	} `json:"api"`

	Raw []byte `json:"-"`
}

// Parse reads the manifest bytes and fills sensible defaults.
func Parse(data []byte) (*Module, error) {
	var m Module
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("parse module manifest: %w", err)
	}
	if strings.TrimSpace(m.Name) == "" {
		return nil, fmt.Errorf("module manifest: \"name\" is required")
	}
	if m.API.Version == "" {
		m.API.Version = "v1"
	}
	m.Raw = data
	return &m, nil
}

// MetadataPath is the route where this module serves its metadata, e.g.
// /api/v1/kentos-project-template/metadata.
func (m *Module) MetadataPath() string {
	return fmt.Sprintf("/api/%s/%s/metadata", m.API.Version, m.Name)
}
