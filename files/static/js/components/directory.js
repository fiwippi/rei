export const name = 'directory';

import * as API from "/static/js/api.js"
import * as Util from "/static/js/util.js"

const modeStorage = "rei-mode"
const currentStorage = "rei-current"
const persistStorage = "rei-persist"

export default function () {
    return {
        // Viewing the filesystem
        fh: {},
        files: [],
        folder: Util.Files.CleanHref(window.location.pathname, true),
        sortType: "name",
        response: 'Loading',

        sortedFiles() {
            if (this.sortType === "name")
                return this.files.sort(Util.Compare.Name)
            else if (this.sortType === "size")
                return this.files.sort(Util.Compare.Size)
            else if (this.sortType === "mod_time")
                return this.files.sort(Util.Compare.ModTime)
            return []
        },

        async _loadFS(reloading) {
            if (reloading) await Util.DOM.Sleep(500) // Requesting too soon after changing the filesystem leads to duplicate files
            console.debug("loading fs")

            // Clear the current file storage
            this._clearStorage(currentStorage)
            // Hide the context menus
            this.pasteMenu.style.display = 'none'
            this.fileMenu.style.display = 'none'

            // Get the files
            await API.FS.ViewDir((this.folder === "/") ? "" : this.folder)
                .then(resp => {
                    console.debug("loaded fs", resp)
                    // Get the files
                    this.files = resp

                    // Format the data
                    let path = window.location.pathname
                    if (!path.endsWith("/")) path = path + "/"
                    for (let i = 0; i < this.files.length; i++) {
                        const isFolder = this.files[i].icon.includes("folder")

                        // Clear the filesize if we are on a folder
                        if (isFolder)
                            this.files[i].size = ""
                        else
                            // Otherwise make the filesize human readable
                            this.files[i].display_size = Util.Fmt.Filesize(this.files[i].size)

                        // Create a href to the file/folder
                        this.files[i].href = `${path}${this.files[i].name}`;
                        if (!isFolder) {
                            this.files[i].href = "/api" + this.files[i].href
                        }

                        // Format the files modtime
                        let date = new Date(this.files[i].mod_time * 1000);
                        this.files[i].mod_time = date
                        this.files[i].display_time = Util.Fmt.ModTime(date)
                    }

                    // Prepend the back button if we're not at the root dir
                    path = window.location.pathname // Go back to path without a suffix
                    if (path !== "/fs/") this.files.unshift({
                        name: "../",
                        icon: "",
                        mod_time: "",
                        display_time: "",
                        size: "",
                        href: path.split("/").slice(0, -1).join("/"),
                    })

                    this.response = ""
                })
                .catch((e) => {
                    console.debug("failed fs", e)
                    this.status = ""
                    if (e.status === 404)
                        this.response = "404 | Page Not Found"
                    else
                        this.response = 'Failed'
                })
        },

        // Context menu related
        status: '',
        showBox: false,
        fileMenu: {},
        pasteMenu: {},
        highlightF: {},

        loadFileMenu(e, f) {
            e.preventDefault();
            this._storeFile(currentStorage, f)

            // If it's a long press event, the coordinates are
            // in e.detail instead of e.x and e.y
            if (Util.DOM.InvalidObject(e.x)) {
                e.x = e.detail.clientX
                e.y = e.detail.clientY
            }

            this.pasteMenu.style.display = 'none'
            if (!Util.DOM.IsEventInElement(e, this.fileMenu)) {
                this.fileMenu.style.display = 'block';
                this.fileMenu.style.left = e.x + 'px';
                this.fileMenu.style.top = e.y + 'px';
                window.getSelection().removeAllRanges()
            }
        },

        loadPasteMenu(e, modal) {
            if (Util.DOM.IsEventInElement(e, modal))
                return
            if (this.validPasteMenu()) {
                e.preventDefault()
                if (Util.DOM.IsEventInElement(e, this.pasteMenu)) {
                    return
                }
                if (!Util.DOM.IsEventInElement(e, this.fileMenu)) {
                    this.fileMenu.style.display = 'none';
                    this.pasteMenu.style.display = 'block';
                    this.pasteMenu.style.left = e.x + 'px';
                    this.pasteMenu.style.top = e.y + 'px';
                }
            }
        },

        closeFileMenu() {
            // Moves a file to persist storage if it exists
            // and hides the file menu
            const cf = this._getFile(currentStorage)
            if (cf)
                this._storeFile(persistStorage, cf)
            this.fileMenu.style.display = 'none';
        },

        validPasteMenu() {
            return !this.pasteMenu.hasOwnProperty('isValid')
        },

        // Init

        async init() {
            // Create the folder header
            this.fh = document.getElementById("folderHeader")
            this.fh.innerHTML = '<span>' + ("/" + decodeURI(this.folder.slice(0, -1))).split('/').join('/</span><span>') + '</span>'

            // Setup the context menu callback
            let modal = document.getElementById("modal");
            this.fileMenu = document.getElementById('fileCtx');
            this.pasteMenu = document.getElementById('pasteCtx');
            if (this.pasteMenu === null)
                this.pasteMenu = {style:{}, isValid: false}

            document.addEventListener("click", (e) => {
                // Hide the appropriate file menu
                if (!Util.DOM.IsEventInElement(e, this.fileMenu))
                    this.fileMenu.style.display = 'none';
                if (!Util.DOM.IsEventInElement(e, this.pasteMenu))
                    this.pasteMenu.style.display = 'none';
                // Check if we should clear the persist storage
                let target = e.target.nodeName.toUpperCase()
                if (target !== "SPAN" && target !== "SELECT" && target !== "BUTTON" &&
                    target !== "A" && target !== "LABEL" && target !== "INPUT")
                    this._clearStorage(persistStorage)
                // Clear the current storage if we're not clicking on a context menu
                if (!Util.DOM.IsEventInElement(e, this.fileMenu) && !Util.DOM.IsEventInElement(e, this.pasteMenu))
                    this._clearStorage(currentStorage)
            });
            document.addEventListener("long-press", (e) => {
                e.x = e.detail.clientX;
                e.y = e.detail.clientY;
                this.loadPasteMenu(e, modal);
            });
            document.addEventListener("contextmenu", (e) => {
                this.loadPasteMenu(e, modal);
            });

            // Load the highlight file if applicable
            const pf = this._getFile(persistStorage)
            if (!Util.DOM.InvalidObject(pf))
                this.highlightF = pf

            // Load the files
            let cancel = Util.Animate.DotDotDot("Loading", (str) => this.response = str)
            await this._loadFS()
            cancel()
        },

        async logout() {
            await API.Auth.Logout()
                .then(() => {
                    window.location.reload();
                })
                .catch(() => {
                    this.status = "Failed"
                })
        },

        // File uploading
        async dropFiles(e) {
            e.stopPropagation();
            e.preventDefault();

            // If directory support is available
            if(e.dataTransfer && e.dataTransfer.items)
            {
                let items = e.dataTransfer.items;
                for (let i = 0; i < items.length; i++) {
                    let item = items[i].webkitGetAsEntry();
                    if (item) {
                        await this._traverseFileTree(item);
                    }
                }
            } else {
                this.status = "Unsupported"
            }

            await Util.DOM.Sleep(500)
            await this._loadFS(true)
        },

        async _traverseFileTree(item, path) {
            let _this = this;
            path = path || "";
            if (item.isFile) {
                // Get file
                item.file(async (file) => {
                    await this._newFiles([Util.Files.Rename(file, path + file.name)], true)
                });
            } else if (item.isDirectory) {
                // Get folder contents
                let dirReader = item.createReader();
                dirReader.readEntries(async (entries) => {
                    await this._newFolder(path + item.name, true)
                    for (let i = 0; i < entries.length; i++) {
                        await _this._traverseFileTree(entries[i], path + item.name + "/");
                    }
                });
            }
        },

        // Util functions
        _askOverwriteFiles(files) {
            // Check if we will be overwriting a file
            let remove = []
            for (let i = 0; i < this.files.length; i++) {
                for (let j = 0; j < files.length; j++) {
                    if (this.files[i].name === files[j].name) {
                        // Ask if we still have to overwrite
                        let overwrite = confirm(`Do you want to overwrite '${this.files[i].name}' ?`)
                        if (!overwrite)
                            remove.push(files[j]);
                    }
                }
            }

            // Remove the files that we are going to remove
            // and return the file list
            const removeSet = new Set(remove);
            return Object.values(files).filter((f) => {
                return !removeSet.has(f);
            });
        },

        _askOverwriteName(name) {
            let href = this.folder + name
            let f = {
                name: name,
                href: href,
            }

            let confirmed = this._askOverwriteFiles([f])
            return confirmed.length > 0 // We aren't going to rename/have new files on the fs
        },

        // Storage API
        _storeFile(type, f) {
            if (type === persistStorage)
                this.highlightF = f
            sessionStorage.setItem(type, JSON.stringify(f))
        },

        _getFile(type) {
            return JSON.parse(sessionStorage.getItem(type))
        },

        _clearStorage(type) {
            if (type === persistStorage)
                this.highlightF = {}
            sessionStorage.removeItem(type)
        },

        // The file heading
        fhClick(e) {
            const p = Array.from(document.querySelector("h1").childNodes).map(k => k.innerText)
            const i = p.findIndex(s => s === e.target.innerText)
            const dst = p.slice(0, i + 1).join("").slice(1)
            window.location.href = "/fs/" + encodeURI(dst)
        },

        // Editing the filesystem
        async newFolder() {
            let name = prompt("Folder Name", "");
            if (name === null || name === "")
                return
            await this._newFolder(name, true)
        },

        async _newFolder(name, reload) {
            if (!this._askOverwriteName(name))
                return
            await API.FS.NewFolder(this.folder, name)
                .then(() => {
                    if (reload) this._loadFS(true)
                    this.status = "Success"
                })
                .catch(() => {
                    this.status = "Failed"
                })
        },

        async newFiles(files) {
            return this._newFiles(files, true)
        },

        async _newFiles(files, reload) {
            let confirmed = this._askOverwriteFiles(files)
            if (confirmed.length === 0)
                return

            await API.FS.NewFiles(this.folder, confirmed,
                async (e) => {
                    console.debug("success upload", e)
                    if (reload) await this._loadFS(true)
                    this.status = "Success"
                },
                (e) => {
                    console.error(e);
                    this.status = "Failed"
                },
                (e) => {
                    this.status = `Progress: ${Util.Fmt.Percent(e.loaded / e.total)}`
                },
            )
        },

        cutItem() {
            this.closeFileMenu()
            sessionStorage.setItem(modeStorage, "cut")
        },

        copyItem() {
            this.closeFileMenu()
            sessionStorage.setItem(modeStorage, "copy")
        },

        async deleteItem() {
            const f = this._getFile(currentStorage)
            if (Util.DOM.InvalidObject(f))
                return

            // Clear the file from the persist and current storage
            this._clearStorage(currentStorage)
            const pf = this._getFile(persistStorage)
            // We check if persist storage doesn't hold a file which isn't the delete file
            if (!Util.DOM.InvalidObject(pf) && (pf.name === f.name && pf.href === f.href))
                this._clearStorage(persistStorage)

            await API.FS.DeleteItem(this.folder + f.name)
                .then(() => {
                    this._loadFS(false)
                    this.status = "Success"
                })
                .catch(() => {
                    this.status = "Failed"
                });
        },

        async renameItem() {
            // Get the file
            const cf = this._getFile(currentStorage)
            if (Util.DOM.InvalidObject(cf))
                return
            // Close the file menu
            this.fileMenu.style.display = 'none';

            // Get the new filename
            let name = prompt("Name", cf.name);
            // Ensure the name is valid
            if (name === null || name === "" || name === cf.name)
                return

            // If we are going to overwrite the filename, check we're allowed to
            if (!this._askOverwriteName(name))
                return

            // Perform the rename
            let oldPath = Util.Files.CleanHref(cf.href)
            let newPath = this.folder + name
            await API.FS.MoveItem(oldPath, newPath, "cut")
                .then(() => {
                    this._loadFS(false)
                    this.status = "Success"
                })
                .catch(() => {
                    this.status = "Failed"
                });
        },

        async pasteItem() {
            // Close the paste menu
            this.pasteMenu.style.display = 'none';

            // Get the file
            const pf = this._getFile(persistStorage)
            if (Util.DOM.InvalidObject(pf))
                return

            // Clear the file from storage
            this._clearStorage(currentStorage)
            this._clearStorage(persistStorage)

            // Get the new filename
            let name = pf.name
            // If we are going to overwrite the filename, check we're allowed to
            if (!this._askOverwriteName(name))
                return

            let oldPath = Util.Files.CleanHref(pf.href)
            let newPath = this.folder + name

            // Perform the rename
            await API.FS.MoveItem(oldPath, newPath, sessionStorage.getItem(modeStorage))
                .then(() => {
                    this._loadFS(false)
                    this.status = "Success"
                })
                .catch(() => {
                    this.status = "Failed"
                });
        },

        // QR Modal
        qr: new QRCode(document.getElementById("qrcode"), {
            text: "",
            width: 256,
            height: 256,
            border: 4,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        }),
        visible: false,
        fileLink: '',

        modal_bg: {
            ['x-show']() {
                return this.visible
            },
            ['@keyup.escape.document']() {
                this.hideModal()
            },
        },
        modal_content: {
            ['x-show']() {
                return this.visible
            },
            ['@click.away']() {
                this.hideModal()
            },
        },
        modal_close: {
            ['@click']() {
                this.hideModal()
            },
        },

        showModal() {
            const f = this._getFile(currentStorage)
            if (Util.DOM.InvalidObject(f))
                return

            this.qr.clear()
            const link = `${window.location.protocol}//${window.location.hostname}${f.href}`
            this.fileLink = link
            this.qr.makeCode(link);
            this.visible = true
        },
        hideModal() { this.visible = false },
    }
}


// Long press
!function(e,t){"use strict";var n=null,a="PointerEvent"in e||e.navigator&&"msPointerEnabled"in e.navigator,i="ontouchstart"in e||navigator.MaxTouchPoints>0||navigator.msMaxTouchPoints>0,o=a?"pointerdown":i?"touchstart":"mousedown",r=a?"pointerup":i?"touchend":"mouseup",m=a?"pointermove":i?"touchmove":"mousemove",u=0,s=0,c=10,l=10;function v(e){f(),e=function(e){if(void 0!==e.changedTouches)return e.changedTouches[0];return e}(e),this.dispatchEvent(new CustomEvent("long-press",{bubbles:!0,cancelable:!0,detail:{clientX:e.clientX,clientY:e.clientY},clientX:e.clientX,clientY:e.clientY,offsetX:e.offsetX,offsetY:e.offsetY,pageX:e.pageX,pageY:e.pageY,screenX:e.screenX,screenY:e.screenY}))||t.addEventListener("click",function e(n){t.removeEventListener("click",e,!0),function(e){e.stopImmediatePropagation(),e.preventDefault(),e.stopPropagation()}(n)},!0)}function d(a){f(a);var i=a.target,o=parseInt(function(e,n,a){for(;e&&e!==t.documentElement;){var i=e.getAttribute(n);if(i)return i;e=e.parentNode}return a}(i,"data-long-press-delay","800"),10);n=function(t,n){if(!(e.requestAnimationFrame||e.webkitRequestAnimationFrame||e.mozRequestAnimationFrame&&e.mozCancelRequestAnimationFrame||e.oRequestAnimationFrame||e.msRequestAnimationFrame))return e.setTimeout(t,n);var a=(new Date).getTime(),i={},o=function(){(new Date).getTime()-a>=n?t.call():i.value=requestAnimFrame(o)};return i.value=requestAnimFrame(o),i}(v.bind(i,a),o)}function f(t){var a;(a=n)&&(e.cancelAnimationFrame?e.cancelAnimationFrame(a.value):e.webkitCancelAnimationFrame?e.webkitCancelAnimationFrame(a.value):e.webkitCancelRequestAnimationFrame?e.webkitCancelRequestAnimationFrame(a.value):e.mozCancelRequestAnimationFrame?e.mozCancelRequestAnimationFrame(a.value):e.oCancelRequestAnimationFrame?e.oCancelRequestAnimationFrame(a.value):e.msCancelRequestAnimationFrame?e.msCancelRequestAnimationFrame(a.value):clearTimeout(a)),n=null}"function"!=typeof e.CustomEvent&&(e.CustomEvent=function(e,n){n=n||{bubbles:!1,cancelable:!1,detail:void 0};var a=t.createEvent("CustomEvent");return a.initCustomEvent(e,n.bubbles,n.cancelable,n.detail),a},e.CustomEvent.prototype=e.Event.prototype),e.requestAnimFrame=e.requestAnimationFrame||e.webkitRequestAnimationFrame||e.mozRequestAnimationFrame||e.oRequestAnimationFrame||e.msRequestAnimationFrame||function(t){e.setTimeout(t,1e3/60)},t.addEventListener(r,f,!0),t.addEventListener(m,function(e){var t=Math.abs(u-e.clientX),n=Math.abs(s-e.clientY);(t>=c||n>=l)&&f()},!0),t.addEventListener("wheel",f,!0),t.addEventListener("scroll",f,!0),t.addEventListener(o,function(e){u=e.clientX,s=e.clientY,d(e)},!0)}(window,document);

// QR code
let QRCode;!function(){function r(t){this.mode=n.MODE_8BIT_BYTE,this.data=t,this.parsedData=[];for(var e=0,r=this.data.length;e<r;e++){var o=[],i=this.data.charCodeAt(e);65536<i?(o[0]=240|(1835008&i)>>>18,o[1]=128|(258048&i)>>>12,o[2]=128|(4032&i)>>>6,o[3]=128|63&i):2048<i?(o[0]=224|(61440&i)>>>12,o[1]=128|(4032&i)>>>6,o[2]=128|63&i):128<i?(o[0]=192|(1984&i)>>>6,o[1]=128|63&i):o[0]=i,this.parsedData.push(o)}this.parsedData=Array.prototype.concat.apply([],this.parsedData),this.parsedData.length!=this.data.length&&(this.parsedData.unshift(191),this.parsedData.unshift(187),this.parsedData.unshift(239))}function h(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}r.prototype={getLength:function(t){return this.parsedData.length},write:function(t){for(var e=0,r=this.parsedData.length;e<r;e++)t.put(this.parsedData[e],8)}},h.prototype={addData:function(t){var e=new r(t);this.dataList.push(e),this.dataCache=null},isDark:function(t,e){if(t<0||this.moduleCount<=t||e<0||this.moduleCount<=e)throw new Error(t+","+e);return this.modules[t][e]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(t,e){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var o=0;o<this.moduleCount;o++)this.modules[r][o]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(t,e),7<=this.typeNumber&&this.setupTypeNumber(t),null==this.dataCache&&(this.dataCache=h.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)},setupPositionProbePattern:function(t,e){for(var r=-1;r<=7;r++)if(!(t+r<=-1||this.moduleCount<=t+r))for(var o=-1;o<=7;o++)e+o<=-1||this.moduleCount<=e+o||(this.modules[t+r][e+o]=0<=r&&r<=6&&(0==o||6==o)||0<=o&&o<=6&&(0==r||6==r)||2<=r&&r<=4&&2<=o&&o<=4)},getBestMaskPattern:function(){for(var t=0,e=0,r=0;r<8;r++){this.makeImpl(!0,r);var o=_.getLostPoint(this);(0==r||o<t)&&(t=o,e=r)}return e},createMovieClip:function(t,e,r){var o=t.createEmptyMovieClip(e,r);this.make();for(var i=0;i<this.modules.length;i++)for(var n=1*i,a=0;a<this.modules[i].length;a++){var s=1*a;this.modules[i][a]&&(o.beginFill(0,100),o.moveTo(s,n),o.lineTo(s+1,n),o.lineTo(s+1,n+1),o.lineTo(s,n+1),o.endFill())}return o},setupTimingPattern:function(){for(var t=8;t<this.moduleCount-8;t++)null==this.modules[t][6]&&(this.modules[t][6]=t%2==0);for(var e=8;e<this.moduleCount-8;e++)null==this.modules[6][e]&&(this.modules[6][e]=e%2==0)},setupPositionAdjustPattern:function(){for(var t=_.getPatternPosition(this.typeNumber),e=0;e<t.length;e++)for(var r=0;r<t.length;r++){var o=t[e],i=t[r];if(null==this.modules[o][i])for(var n=-2;n<=2;n++)for(var a=-2;a<=2;a++)this.modules[o+n][i+a]=-2==n||2==n||-2==a||2==a||0==n&&0==a}},setupTypeNumber:function(t){for(var e=_.getBCHTypeNumber(this.typeNumber),r=0;r<18;r++){var o=!t&&1==(e>>r&1);this.modules[Math.floor(r/3)][r%3+this.moduleCount-8-3]=o}for(r=0;r<18;r++){o=!t&&1==(e>>r&1);this.modules[r%3+this.moduleCount-8-3][Math.floor(r/3)]=o}},setupTypeInfo:function(t,e){for(var r=this.errorCorrectLevel<<3|e,o=_.getBCHTypeInfo(r),i=0;i<15;i++){var n=!t&&1==(o>>i&1);i<6?this.modules[i][8]=n:i<8?this.modules[i+1][8]=n:this.modules[this.moduleCount-15+i][8]=n}for(i=0;i<15;i++){n=!t&&1==(o>>i&1);i<8?this.modules[8][this.moduleCount-i-1]=n:i<9?this.modules[8][15-i-1+1]=n:this.modules[8][15-i-1]=n}this.modules[this.moduleCount-8][8]=!t},mapData:function(t,e){for(var r=-1,o=this.moduleCount-1,i=7,n=0,a=this.moduleCount-1;0<a;a-=2)for(6==a&&a--;;){for(var s=0;s<2;s++)if(null==this.modules[o][a-s]){var h=!1;n<t.length&&(h=1==(t[n]>>>i&1)),_.getMask(e,o,a-s)&&(h=!h),this.modules[o][a-s]=h,-1==--i&&(n++,i=7)}if((o+=r)<0||this.moduleCount<=o){o-=r,r=-r;break}}}},h.PAD0=236,h.PAD1=17,h.createData=function(t,e,r){for(var o=p.getRSBlocks(t,e),i=new m,n=0;n<r.length;n++){var a=r[n];i.put(a.mode,4),i.put(a.getLength(),_.getLengthInBits(a.mode,t)),a.write(i)}var s=0;for(n=0;n<o.length;n++)s+=o[n].dataCount;if(i.getLengthInBits()>8*s)throw new Error("code length overflow. ("+i.getLengthInBits()+">"+8*s+")");for(i.getLengthInBits()+4<=8*s&&i.put(0,4);i.getLengthInBits()%8!=0;)i.putBit(!1);for(;!(i.getLengthInBits()>=8*s||(i.put(h.PAD0,8),i.getLengthInBits()>=8*s));)i.put(h.PAD1,8);return h.createBytes(i,o)},h.createBytes=function(t,e){for(var r=0,o=0,i=0,n=new Array(e.length),a=new Array(e.length),s=0;s<e.length;s++){var h=e[s].dataCount,l=e[s].totalCount-h;o=Math.max(o,h),i=Math.max(i,l),n[s]=new Array(h);for(var u=0;u<n[s].length;u++)n[s][u]=255&t.buffer[u+r];r+=h;var d=_.getErrorCorrectPolynomial(l),g=new v(n[s],d.getLength()-1).mod(d);a[s]=new Array(d.getLength()-1);for(u=0;u<a[s].length;u++){var f=u+g.getLength()-a[s].length;a[s][u]=0<=f?g.get(f):0}}var c=0;for(u=0;u<e.length;u++)c+=e[u].totalCount;var p=new Array(c),m=0;for(u=0;u<o;u++)for(s=0;s<e.length;s++)u<n[s].length&&(p[m++]=n[s][u]);for(u=0;u<i;u++)for(s=0;s<e.length;s++)u<a[s].length&&(p[m++]=a[s][u]);return p};for(var n={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},l={L:1,M:0,Q:3,H:2},o=0,i=1,a=2,s=3,u=4,d=5,g=6,f=7,_={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(t){for(var e=t<<10;0<=_.getBCHDigit(e)-_.getBCHDigit(_.G15);)e^=_.G15<<_.getBCHDigit(e)-_.getBCHDigit(_.G15);return(t<<10|e)^_.G15_MASK},getBCHTypeNumber:function(t){for(var e=t<<12;0<=_.getBCHDigit(e)-_.getBCHDigit(_.G18);)e^=_.G18<<_.getBCHDigit(e)-_.getBCHDigit(_.G18);return t<<12|e},getBCHDigit:function(t){for(var e=0;0!=t;)e++,t>>>=1;return e},getPatternPosition:function(t){return _.PATTERN_POSITION_TABLE[t-1]},getMask:function(t,e,r){switch(t){case o:return(e+r)%2==0;case i:return e%2==0;case a:return r%3==0;case s:return(e+r)%3==0;case u:return(Math.floor(e/2)+Math.floor(r/3))%2==0;case d:return e*r%2+e*r%3==0;case g:return(e*r%2+e*r%3)%2==0;case f:return(e*r%3+(e+r)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}},getErrorCorrectPolynomial:function(t){for(var e=new v([1],0),r=0;r<t;r++)e=e.multiply(new v([1,c.gexp(r)],0));return e},getLengthInBits:function(t,e){if(1<=e&&e<10)switch(t){case n.MODE_NUMBER:return 10;case n.MODE_ALPHA_NUM:return 9;case n.MODE_8BIT_BYTE:case n.MODE_KANJI:return 8;default:throw new Error("mode:"+t)}else if(e<27)switch(t){case n.MODE_NUMBER:return 12;case n.MODE_ALPHA_NUM:return 11;case n.MODE_8BIT_BYTE:return 16;case n.MODE_KANJI:return 10;default:throw new Error("mode:"+t)}else{if(!(e<41))throw new Error("type:"+e);switch(t){case n.MODE_NUMBER:return 14;case n.MODE_ALPHA_NUM:return 13;case n.MODE_8BIT_BYTE:return 16;case n.MODE_KANJI:return 12;default:throw new Error("mode:"+t)}}},getLostPoint:function(t){for(var e=t.getModuleCount(),r=0,o=0;o<e;o++)for(var i=0;i<e;i++){for(var n=0,a=t.isDark(o,i),s=-1;s<=1;s++)if(!(o+s<0||e<=o+s))for(var h=-1;h<=1;h++)i+h<0||e<=i+h||0==s&&0==h||a==t.isDark(o+s,i+h)&&n++;5<n&&(r+=3+n-5)}for(o=0;o<e-1;o++)for(i=0;i<e-1;i++){var l=0;t.isDark(o,i)&&l++,t.isDark(o+1,i)&&l++,t.isDark(o,i+1)&&l++,t.isDark(o+1,i+1)&&l++,0!=l&&4!=l||(r+=3)}for(o=0;o<e;o++)for(i=0;i<e-6;i++)t.isDark(o,i)&&!t.isDark(o,i+1)&&t.isDark(o,i+2)&&t.isDark(o,i+3)&&t.isDark(o,i+4)&&!t.isDark(o,i+5)&&t.isDark(o,i+6)&&(r+=40);for(i=0;i<e;i++)for(o=0;o<e-6;o++)t.isDark(o,i)&&!t.isDark(o+1,i)&&t.isDark(o+2,i)&&t.isDark(o+3,i)&&t.isDark(o+4,i)&&!t.isDark(o+5,i)&&t.isDark(o+6,i)&&(r+=40);var u=0;for(i=0;i<e;i++)for(o=0;o<e;o++)t.isDark(o,i)&&u++;return r+=10*(Math.abs(100*u/e/e-50)/5)}},c={glog:function(t){if(t<1)throw new Error("glog("+t+")");return c.LOG_TABLE[t]},gexp:function(t){for(;t<0;)t+=255;for(;256<=t;)t-=255;return c.EXP_TABLE[t]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)},t=0;t<8;t++)c.EXP_TABLE[t]=1<<t;for(t=8;t<256;t++)c.EXP_TABLE[t]=c.EXP_TABLE[t-4]^c.EXP_TABLE[t-5]^c.EXP_TABLE[t-6]^c.EXP_TABLE[t-8];for(t=0;t<255;t++)c.LOG_TABLE[c.EXP_TABLE[t]]=t;function v(t,e){if(null==t.length)throw new Error(t.length+"/"+e);for(var r=0;r<t.length&&0==t[r];)r++;this.num=new Array(t.length-r+e);for(var o=0;o<t.length-r;o++)this.num[o]=t[o+r]}function p(t,e){this.totalCount=t,this.dataCount=e}function m(){this.buffer=[],this.length=0}v.prototype={get:function(t){return this.num[t]},getLength:function(){return this.num.length},multiply:function(t){for(var e=new Array(this.getLength()+t.getLength()-1),r=0;r<this.getLength();r++)for(var o=0;o<t.getLength();o++)e[r+o]^=c.gexp(c.glog(this.get(r))+c.glog(t.get(o)));return new v(e,0)},mod:function(t){if(this.getLength()-t.getLength()<0)return this;for(var e=c.glog(this.get(0))-c.glog(t.get(0)),r=new Array(this.getLength()),o=0;o<this.getLength();o++)r[o]=this.get(o);for(o=0;o<t.getLength();o++)r[o]^=c.gexp(c.glog(t.get(o))+e);return new v(r,0).mod(t)}},p.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],p.getRSBlocks=function(t,e){var r=p.getRsBlockTable(t,e);if(null==r)throw new Error("bad rs block @ typeNumber:"+t+"/errorCorrectLevel:"+e);for(var o=r.length/3,i=[],n=0;n<o;n++)for(var a=r[3*n+0],s=r[3*n+1],h=r[3*n+2],l=0;l<a;l++)i.push(new p(s,h));return i},p.getRsBlockTable=function(t,e){switch(e){case l.L:return p.RS_BLOCK_TABLE[4*(t-1)+0];case l.M:return p.RS_BLOCK_TABLE[4*(t-1)+1];case l.Q:return p.RS_BLOCK_TABLE[4*(t-1)+2];case l.H:return p.RS_BLOCK_TABLE[4*(t-1)+3];default:return}},m.prototype={get:function(t){var e=Math.floor(t/8);return 1==(this.buffer[e]>>>7-t%8&1)},put:function(t,e){for(var r=0;r<e;r++)this.putBit(1==(t>>>e-r-1&1))},getLengthInBits:function(){return this.length},putBit:function(t){var e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}};var C=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];function w(){var t=!1,e=navigator.userAgent;if(/android/i.test(e)){t=!0;var r=e.toString().match(/android ([0-9]\.[0-9])/i);r&&r[1]&&(t=parseFloat(r[1]))}return t}var e,D,b=((e=function(t,e){this._el=t,this._htOption=e}).prototype.draw=function(t){var e=this._htOption,r=this._el,o=t.getModuleCount();function i(t,e){var r=document.createElementNS("http://www.w3.org/2000/svg",t);for(var o in e)e.hasOwnProperty(o)&&r.setAttribute(o,e[o]);return r}Math.floor(e.width/o),Math.floor(e.height/o),this.clear();var n=i("svg",{viewBox:"0 0 "+String(o+2*e.border)+" "+String(o+2*e.border),width:"100%",height:"100%",fill:e.colorLight});n.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink"),r.appendChild(n),n.appendChild(i("rect",{fill:e.colorLight,width:"100%",height:"100%"})),n.appendChild(i("rect",{fill:e.colorDark,x:String(e.border),y:String(e.border),width:"1",height:"1",id:"template"}));for(var a=0;a<o;a++)for(var s=0;s<o;s++)if(t.isDark(a,s)){var h=i("use",{x:String(s),y:String(a)});h.setAttributeNS("http://www.w3.org/1999/xlink","href","#template"),n.appendChild(h)}},e.prototype.clear=function(){for(;this._el.hasChildNodes();)this._el.removeChild(this._el.lastChild)},e),L="svg"===document.documentElement.tagName.toLowerCase()?b:"undefined"==typeof CanvasRenderingContext2D?((D=function(t,e){this._el=t,this._htOption=e}).prototype.draw=function(t){for(var e=this._htOption,r=this._el,o=t.getModuleCount(),i=Math.floor(e.width/o),n=Math.floor(e.height/o),a=['<table style="border:0;border-collapse:collapse;">'],s=0;s<e.border;s++){a.push("<tr>");for(var h=0;h<o+2*e.border;h++)a.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+i+"px;height:"+n+"px;background-color:"+e.colorLight+';"></td>');a.push("</tr>")}for(s=0;s<o;s++){for(a.push("<tr>"),h=0;h<e.border;h++)a.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+i+"px;height:"+n+"px;background-color:"+e.colorLight+';"></td>');for(h=0;h<o;h++)a.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+i+"px;height:"+n+"px;background-color:"+(t.isDark(s,h)?e.colorDark:e.colorLight)+';"></td>');for(h=0;h<e.border;h++)a.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+i+"px;height:"+n+"px;background-color:"+e.colorLight+';"></td>');a.push("</tr>")}for(s=0;s<e.border;s++){for(a.push("<tr>"),h=0;h<o+2*e.border;h++)a.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:'+i+"px;height:"+n+"px;background-color:"+e.colorLight+';"></td>');a.push("</tr>")}a.push("</table>"),r.innerHTML=a.join("");var l=r.childNodes[0],u=(e.width-l.offsetWidth)/2,d=(e.height-l.offsetHeight)/2;0<u&&0<d&&(l.style.margin=d+"px "+u+"px")},D.prototype.clear=function(){this._el.innerHTML=""},D):function(){function t(){this._elImage.src=this._elCanvas.toDataURL("image/png"),this._elImage.style.display="block",this._elCanvas.style.display="none"}if(this && this._android&&this._android<=2.1){var u=1/window.devicePixelRatio,d=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(t,e,r,o,i,n,a,s,h){if("nodeName"in t&&/img/i.test(t.nodeName))for(var l=arguments.length-1;1<=l;l--)arguments[l]=arguments[l]*u;else void 0===s&&(arguments[1]*=u,arguments[2]*=u,arguments[3]*=u,arguments[4]*=u);d.apply(this,arguments)}}var e=function(t,e){this._bIsPainted=!1,this._android=w(),this._htOption=e,this._elCanvas=document.createElement("canvas"),this._elCanvas.width=e.width,this._elCanvas.height=e.height,t.appendChild(this._elCanvas),this._el=t,this._oContext=this._elCanvas.getContext("2d"),this._bIsPainted=!1,this._elImage=document.createElement("img"),this._elImage.alt="Scan me!",this._elImage.style.display="none",this._el.appendChild(this._elImage),this._bSupportDataURI=null};return e.prototype.draw=function(t){var e=this._elImage,r=this._oContext,o=this._htOption,i=t.getModuleCount(),n=o.width/(i+2*o.border),a=o.height/(i+2*o.border),s=o.border*n,h=o.border*a,l=Math.round(n),u=Math.round(a);e.style.display="none",this.clear(),r.strokeStyle=o.colorLight,r.lineWidth=1,r.fillStyle=o.colorLight,r.fillRect(0,0,o.width,h),r.fillRect(0,o.height-h,o.width,o.height),r.fillRect(0,h,s,o.height-h),r.fillRect(o.width-s,h,o.width,o.height-h);for(var d=0;d<i;d++)for(var g=0;g<i;g++){var f=t.isDark(d,g),c=g*n,p=d*a;r.strokeStyle=f?o.colorDark:o.colorLight,r.lineWidth=1,r.fillStyle=f?o.colorDark:o.colorLight,r.fillRect(c+s,p+h,n,a),r.strokeRect(Math.floor(c+s)+.5,Math.floor(p+h)+.5,l,u),r.strokeRect(Math.ceil(c+s)-.5,Math.ceil(p+h)-.5,l,u)}this._bIsPainted=!0},e.prototype.makeImage=function(){this._bIsPainted&&function(t,e){var r=this;if(r._fFail=e,r._fSuccess=t,null===r._bSupportDataURI){var o=document.createElement("img"),i=function(){r._bSupportDataURI=!1,r._fFail&&r._fFail.call(r)};return o.onabort=i,o.onerror=i,o.onload=function(){r._bSupportDataURI=!0,r._fSuccess&&r._fSuccess.call(r)},void(o.src="data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==")}!0===r._bSupportDataURI&&r._fSuccess?r._fSuccess.call(r):!1===r._bSupportDataURI&&r._fFail&&r._fFail.call(r)}.call(this,t)},e.prototype.isPainted=function(){return this._bIsPainted},e.prototype.clear=function(){this._oContext.clearRect(0,0,this._elCanvas.width,this._elCanvas.height),this._bIsPainted=!1},e.prototype.round=function(t){return t?Math.floor(1e3*t)/1e3:t},e}();function y(t,e){for(var r,o,i=1,n=(r=t,(o=encodeURI(r).toString().replace(/\%[0-9a-fA-F]{2}/g,"a")).length+(o.length!=r?3:0)),a=0,s=C.length;a<=s;a++){var h=0;switch(e){case l.L:h=C[a][0];break;case l.M:h=C[a][1];break;case l.Q:h=C[a][2];break;case l.H:h=C[a][3]}if(n<=h)break;i++}if(C.length<i)throw new Error("Too long data");return i}(QRCode=function(t,e){if(this._htOption={width:256,height:256,border:4,typeNumber:4,colorDark:"#000000",colorLight:"#ffffff",correctLevel:l.H},"string"==typeof e&&(e={text:e}),e)for(var r in e)this._htOption[r]=e[r];"string"==typeof t&&(t=document.getElementById(t)),this._htOption.useSVG&&(L=b),this._android=w(),this._el=t,this._oQRCode=null,this._oDrawing=new L(this._el,this._htOption),this._htOption.text&&this.makeCode(this._htOption.text)}).prototype.makeCode=function(t){this._oQRCode=new h(y(t,this._htOption.correctLevel),this._htOption.correctLevel),this._oQRCode.addData(t),this._oQRCode.make(),this._el.title=t,this._oDrawing.draw(this._oQRCode),this.makeImage()},QRCode.prototype.makeImage=function(){"function"==typeof this._oDrawing.makeImage&&(!this._android||3<=this._android)&&this._oDrawing.makeImage()},QRCode.prototype.clear=function(){this._oDrawing.clear()},QRCode.CorrectLevel=l}(),"undefined"!=typeof module&&(module.exports=QRCode);
