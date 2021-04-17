package rei

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
)

// Represents a row of data on the fileserver, i.e. an item in a directory
type rowData struct {
	Name    string        // Name of the file/folder
	Href    template.HTML // Href to the row item
	Size    string        // Size of the file (if applicable)
	Ext     string        // Extension of the file (if applicable)
	ModTime string        // Time the file was modified
}

// Represents a directory listing
type pageData struct {
	Title                 template.HTML // Title of the HTML Window
	ExtraPath, StaticPath template.HTML // The extra path prepended to initpath
	Ro                    bool          // Read only
	RowsFiles             []rowData     // Files in the directory
	RowsFolders           []rowData     // Folders in the directory
}

// Remote Procedure Call, this is a json struct which
// rei receives from the client and performs actions
// based on it, e.g. moving, uploading and removing files
type rpcCall struct {
	Call string   `json:"call"` // What type of action to perform
	Args []string `json:"args"` // Additional arguments
}

// Returns a HTML page for the directory to the client
func viewDir(w http.ResponseWriter, fullPath, path, sortType string) {
	// Collects files in the requested directory and sorts them
	_files, err := ioutil.ReadDir(fullPath)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}

	switch sortType {
	case "size":
		sort.Slice(_files, func(i, j int) bool { return _files[i].Size() > _files[j].Size() })
	case "modtime":
		sort.Slice(_files, func(i, j int) bool { return _files[i].ModTime().After(_files[j].ModTime()) })
	default:
		sort.Slice(_files, func(i, j int) bool { return strings.ToLower(_files[i].Name()) < strings.ToLower(_files[j].Name()) })

	}

	// Compatibility
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	// Create data for the page template
	title := "/" + strings.TrimPrefix(path, fsPath)
	p := pageData{}
	if path != fsPath { // If the path is not the root dir then add a listing to go back one dir
		p.RowsFolders = append(p.RowsFolders, rowData{Name: "../", Href: "../", Size: "", Ext: "folder", ModTime: ""})
	}
	p.ExtraPath = template.HTML(html.EscapeString(extraPath))
	p.StaticPath = template.HTML(html.EscapeString(staticPath))
	p.Ro = ro
	p.Title = template.HTML(html.EscapeString(title))

	for _, el := range _files {
		if skipHidden && strings.HasPrefix(el.Name(), ".") {
			continue
		}
		el, _ = os.Stat(fullPath + "/" + el.Name())
		href := url.PathEscape(el.Name())
		if el.IsDir() && strings.HasPrefix(href, "/") {
			href = strings.Replace(href, "/", "", 1)
		}

		year, month, day := el.ModTime().Date()
		hour, min, sec := el.ModTime().Clock()
		modtime := fmt.Sprintf("%02d/%02d/%04d %02d:%02d:%02d", day, month, year, hour, min, sec)
		if el.IsDir() {
			p.RowsFolders = append(p.RowsFolders, rowData{el.Name() + "/", template.HTML(href), "", "folder", modtime})
		} else {
			sl := strings.Split(el.Name(), ".")
			ext := fontAwesomeType(strings.ToLower(sl[len(sl)-1]))
			p.RowsFiles = append(p.RowsFiles, rowData{el.Name(), template.HTML(href), humanise(el.Size()), ext, modtime})
		}
	}

	page.Execute(w, p)
}

// Either serves a directory listing or a file itself from the file server
func serveContent(w http.ResponseWriter, r *http.Request) {
	// Ensures the extra path is used
	if !strings.HasPrefix(r.URL.Path, fsPath) {
		http.Redirect(w, r, fsPath, 302)
		return
	}

	// Ensures the file/folder path is valid and allowed
	path := html.UnescapeString(r.URL.Path)
	fullPath, err := validPath(path)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}
	// Gets the file info
	stat, err := os.Stat(fullPath)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}

	// If the item is a folder then serve a directory listing
	if stat.IsDir() {
		// Check what sorting is needed
		if val, found := r.URL.Query()["sort"]; found {
			viewDir(w, fullPath, path, val[0])
		} else {
			viewDir(w, fullPath, path, "date")
		}
	} else { // Otherwise serve the file from the fileserver
		fsHandler.ServeHTTP(w, r)
	}
}

// Uploads a file to a path specified by "gossa-path"
func upload(w http.ResponseWriter, r *http.Request) {
	// Gets upload path and validates it
	path, _ := url.PathUnescape(r.Header.Get("rei-path"))
	reader, _ := r.MultipartReader()
	part, _ := reader.NextPart()
	fp, err := validPath(path)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}

	// Copies the src file to the dst
	dst, _ := os.Create(fp)
	_, err = io.Copy(dst, part)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}
	w.Write([]byte("ok"))
}

// Processes incoming rpc commands from clients
func rpc(w http.ResponseWriter, r *http.Request) {
	// Parses the command into the rpc struct
	var rpc rpcCall
	bodyBytes, err := ioutil.ReadAll(r.Body)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}

	err = json.Unmarshal(bodyBytes, &rpc)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}

	// Processes the rpc opcodes
	if rpc.Call == "mkdirp" { // Opcode for creating new dirs
		path, err := validPath(rpc.Args[0])
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}

		err = os.MkdirAll(path, os.ModePerm)
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}

	} else if rpc.Call == "mv" { // Opcode for moving/renaming files
		srcPath, err := validPath(rpc.Args[0])
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}
		dstPath, err := validPath(rpc.Args[1])
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}

		err = os.Rename(srcPath, dstPath)
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}
	} else if rpc.Call == "rm" { // Opcode for removing files
		path, err := validPath(rpc.Args[0])
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}

		err = os.RemoveAll(path)
		if err != nil {
			sendHTTPResp(w, 500, err)
			return
		}
	}

	w.Write([]byte("ok"))
}

// Zips a directory and serves it to the user
func zipDir(w http.ResponseWriter, r *http.Request) {
	zipPath := r.URL.Query().Get("zipPath")
	zipName := r.URL.Query().Get("zipName")
	wz := zip.NewWriter(w)
	w.Header().Add("Content-Disposition", "attachment; filename=\""+zipName+".zip\"")

	validZipPath, err := validPath(zipPath)
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}
	err = walkZip(wz, validZipPath+"/", "")
	if err != nil {
		sendHTTPResp(w, 500, err)
		return
	}
	wz.Close()
}

//
func redirectToFs(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, fsPath, 302)
}
