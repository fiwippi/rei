package rei

import (
	"flag"
	"fmt"
	"github.com/markbates/pkger"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"
)

// Defaults for gossa flags
const (
	hostDef       = "127.0.0.1"
	portDef       = "8001"
	prefixDef     = "/"
	symlinksDef   = false
	skipHiddenDef = true
	roDef         = false
)

// Flags for gossa
var symlinks, skipHidden, ro bool
var host, port, user, pass, extraPath string

var initPath = "."          // Path to the directory which gossa should serve, defaults to the current dir
var fs http.Handler         // The fileserver handler
var page *template.Template // Template returned to users accessing the fileserver

// Read templates
func readTemplates() error {
	// Parses in the template, script and stylesheet
	templateStr, err := readFileStr(pkger.Include("/static/ui.tmpl"))
	if err != nil {
		return err
	}
	jsStr, err := readFileStr(pkger.Include("/static/script.js"))
	if err != nil {
		return err
	}
	styleStr, err := readFileStr(pkger.Include("/static/style.css"))
	if err != nil {
		return err
	}
	faviconStr, err := fileToBase64(pkger.Include("/static/favicon.png"))
	if err != nil {
		return err
	}

	templateStr = strings.ReplaceAll(templateStr, "js_will_be_here", jsStr)
	templateStr = strings.ReplaceAll(templateStr, "css_will_be_here", styleStr)
	templateStr = strings.ReplaceAll(templateStr, "favicon_will_be_here", faviconStr)

	page, err = template.New("pageTemplate").Parse(templateStr)
	if err != nil {
		return err
	}
	return nil
}

func Server() (*http.Server, error) {
	// Set the flags
	flag.StringVar(&host, "host", hostDef, "Host to listen on")
	flag.StringVar(&port, "port", portDef, "Port to listen on")
	flag.StringVar(&user, "user", "", "Name of the Admin user")
	flag.StringVar(&pass, "pass", "", "Pass of the Admin user")
	flag.StringVar(&extraPath, "prefix", prefixDef, "URL prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
	flag.BoolVar(&symlinks, "follow-symlinks", symlinksDef, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
	flag.BoolVar(&skipHidden, "skip-hidden", skipHiddenDef, "Skip hidden files")
	flag.BoolVar(&ro, "read-only", roDef, "Read only mode (no upload, rename, move, etc...)")

	// Shows gossa usage
	flag.Usage = func() {
		fmt.Printf("\nusage: ./gossa ~/directory-to-share\n\n")
		flag.PrintDefaults()
	}

	// Parses the directory to serve
	flag.Parse()
	if len(flag.Args()) > 0 {
		initPath = flag.Args()[0]
		// Suffixes trimmed to stop errors in validPath() when
		// checking if the given filepath has initpath as prefix
		initPath = strings.TrimSuffix(initPath, "/")
		initPath = strings.TrimSuffix(initPath, "\\")
	}

	return ServerWithOpts(host, port, user, pass, extraPath, symlinks, skipHidden, ro)
}

func ServerWithOpts(Host, Port, User, Pass, ExtraPath string, Symlinks, SkipHidden, Ro bool) (*http.Server, error) {
	var err error

	// User, Pass and the bool var do not need to be checked for defaults
	user = User
	pass = Pass
	symlinks = Symlinks
	skipHidden = SkipHidden
	ro = Ro

	// Set the defaults if they're not already set
	if Host == "" {
		host = hostDef
	} else {
		host = Host
	}
	if Port == "" {
		port = portDef
	} else {
		port = Port
	}
	if ExtraPath == "" {
		extraPath = prefixDef
	} else {
		extraPath = ExtraPath
	}

	log.Info().Str("host", host).Str("port", port).Str("user", user).
		Str("pass", pass).Str("prefix", extraPath).Bool("symlinks", symlinks).
		Bool("skipHidden", skipHidden).Bool("read only", ro).Msg("Flags set")

	// Confirms the path is accessible
	initPath, err = filepath.Abs(initPath)
	if err != nil {
		return nil, fmt.Errorf("Could not get absolute path for: %s\n", initPath)
	}

	// Reads in the templates
	err = readTemplates()
	if err != nil {
		return nil, err
	}

	// Sets the user and pass
	username, password = user, pass

	mux := http.NewServeMux()

	// Disables uploading, removing, moving of files and creation of new directories if gossa is read only
	if !ro {
		mux.HandleFunc(extraPath+"rpc", middleware(http.HandlerFunc(rpc)))
		mux.HandleFunc(extraPath+"post", middleware(http.HandlerFunc(upload)))
	}

	// Registers main routes and creates the fileserver
	mux.HandleFunc(extraPath+"zip", middleware(http.HandlerFunc(zipDir)))
	mux.HandleFunc("/", middleware(http.HandlerFunc(serveContent)))
	fs = http.StripPrefix(extraPath, middleware(http.FileServer(http.Dir(initPath))))

	// Serves the router
	return &http.Server{Addr: host + ":" + port, Handler: mux}, nil
}
