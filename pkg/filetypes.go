package rei

var codeFiles = map[string]bool{
	"go":   true,
	"py":   true,
	"js":   true,
	"java": true,
	"c":    true,
	"cpp":  true,
	"css":  true,
	"html": true,
	"h":    true,
}

var wordFiles = map[string]bool{
	"doc":  true,
	"docx": true,
	"odt":  true,
}

var excelFiles = map[string]bool{
	"xls":  true,
	"xlsx": true,
	"csv":  true,
}

var pptFiles = map[string]bool{
	"ppt":  true,
	"pptx": true,
}

var archiveFiles = map[string]bool{
	"zip": true,
	"tar": true,
	"gz":  true,
	"bz2": true,
	"rar": true,
	"7z":  true,
	"bz":  true,
	"tgz": true,
	"xz":  true,
}

var audioFiles = map[string]bool{
	"mp3":  true,
	"aac":  true,
	"opus": true,
	"m4a":  true,
	"ogg":  true,
	"flac": true,
	"wav":  true,
}

var videoFiles = map[string]bool{
	"mp4":  true,
	"mkv":  true,
	"m4v":  true,
	"avi":  true,
	"ogv":  true,
	"mov":  true,
	"webm": true,
	"wmv":  true,
	"mpeg": true,
	"mpg":  true,
}

var imageFiles = map[string]bool{
	"jpg":  true,
	"jpeg": true,
	"png":  true,
	"gif":  true,
	"tiff": true,
	"bmp":  true,
	"svg":  true,
	"ppm":  true,
	"webp": true,
}

var appleFiles = map[string]bool{
	"ipa": true,
	"dmg": true,
}
