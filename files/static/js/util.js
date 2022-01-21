export const name = 'util';

export class Animate {
    static DotDotDot(text, func) {
        func(`${text}...`)

        let count = 0;
        let interval = setInterval(() => {
            count === 4 ? count = 1 : count++
            func(`${text}${new Array(count).join('.')}`)
        }, 600);

        return () => {
            clearInterval(interval)
        }
    }
}

let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base', caseFirst: 'upper'});

export class Compare {
    static folders(a, b) {
        const x = a.icon.includes("folder")
        const y = b.icon.includes("folder")
        if (x !== y) {
            return x && !y
        }
        return 0
    }

    static ModTime(a, b) {
        // First check if we are sorting a folder
        let cmp = Compare.folders(a, b)
        if (cmp !== 0)
            return cmp

        // Otherwise we are sorting based on mod time
        return b.mod_time - a.mod_time
    }

    static Size(a, b) {
        // First check if we are sorting a folder
        let cmp = Compare.folders(a, b)
        if (cmp !== 0)
            return cmp

        // Otherwise we are sorting based on size
        return b.size - a.size
    }

    static Name(a, b) {
        // First check if we are sorting a folder
        let cmp = Compare.folders(a, b)
        if (cmp !== 0)
            return cmp

        // Otherwise we are sorting based on name
        return collator.compare(a.name, b.name)
    }
}

export class Fmt {
    /**
     * Format bytes as human-readable text.
     *
     * @param bytes Number of bytes.
     * @param si True to use metric (SI) units, aka powers of 1000. False to use
     *           binary (IEC), aka powers of 1024.
     * @param dp Number of decimal places to display.
     *
     * @return Formatted string.
     */
    static Filesize(bytes, si=false, dp=1) {
        const thresh = si ? 1000 : 1024;

        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }

        const units = si
            ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
            : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10**dp;

        do {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


        return bytes.toFixed(dp) + ' ' + units[u];
    }

    static ModTime(date) {
        let year = date.getFullYear().toString().padStart(4, '0')
        let month = (date.getMonth() + 1).toString().padStart(2, '0')
        let day = date.getDate().toString().padStart(2, '0')
        let hour = date.getHours().toString().padStart(2, '0')
        let min = date.getMinutes().toString().padStart(2, '0')
        let sec = date.getSeconds().toString().padStart(2, '0')
        return `${year}/${month}/${day} ${hour}:${min}:${sec}`
    }

    // Percent is supposed to be in the range [0, 1]
    static Percent(p) {
        if (p === undefined || p === null) {
            return undefinedPercent
        }
        return (p * 100).toFixed(2) + "%"
    }
}

const undefinedPercent = Fmt.Percent(0)

export class Files {
    // All files sent to the API should begin with "/"
    static CleanHref(href, ensureFolder) {
        if (href.startsWith("/")) href = href.slice(1)
        if (href.startsWith("api")) href = href.slice(3)
        if (href.startsWith("/")) href = href.slice(1)
        if (href.startsWith("fs")) href = href.slice(3)
        if (href.startsWith("/")) href = href.slice(1)

        if (ensureFolder && !href.endsWith("/"))
            href += "/"

        return href
    }
}

export class DOM {
    static IsEventInElement(event, element)   {
        if (!(typeof element.getBoundingClientRect === "function"))
            return false

        let rect = element.getBoundingClientRect();
        let x = event.clientX;
        if (x < rect.left || x >= rect.right) return false;
        let y = event.clientY;
        if (y < rect.top || y >= rect.bottom) return false;
        return true;
    }

    static InvalidObject(o) {
        return o === null || o === undefined
    }
}