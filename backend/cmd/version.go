package cmd

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"
)

// Version is overridable at build time:
//
//	go build -ldflags "-X kentos-project-template/cmd.Version=1.2.3"
var Version = "dev"

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(_ *cobra.Command, _ []string) {
		fmt.Printf("kentos %s (%s/%s, %s)\n", Version, runtime.GOOS, runtime.GOARCH, runtime.Version())
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
