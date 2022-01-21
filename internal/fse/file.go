package fse

import (
	"os"
	"sort"
	"strings"

	"github.com/fiwippi/rei/internal/fontawesome"
)

type File struct {
	folder  bool
	Icon    string `json:"icon"`     // Font awesome icon
	ModTime int64  `json:"mod_time"` // Mod time of the file
	Name    string `json:"name"`
	Size    int64  `json:"size"`
}

func ReadDir(path string, skipHidden bool) ([]File, error) {
	dir, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	files := make([]File, 0, len(dir))
	for _, d := range dir {
		fi, err := d.Info()
		if err != nil {
			return nil, err
		}

		a := strings.HasPrefix(fi.Name(), ".")
		b := strings.HasPrefix(fi.Name(), "~$") // Microsoft office files
		if skipHidden && (a || b) {
			continue
		}

		file := File{
			folder:  fi.IsDir(),
			Icon:    fontawesome.Style(fi),
			ModTime: fi.ModTime().Unix(),
			Name:    fi.Name(),
			Size:    fi.Size(),
		}
		files = append(files, file)
	}
	sort.SliceStable(files, func(i, j int) bool {
		return files[i].folder && !files[j].folder
	})

	return files, nil
}
