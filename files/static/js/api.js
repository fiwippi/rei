export const name = 'api';

const API_URL = "/api/"

Object.prototype.ensureSuccess = function() {
    return new Promise((resolve, reject) => {
        // Checks we encountered no errors
        if (this.status >= 400 && this.status <= 500) {
            reject(this)
        }

        // Check if we need to be authorised
        if (this.status === 401 && !this.url.endsWith("/login")) {
            window.location.replace('/login')
            reject("unauthorised request")
        }

        // Success
        const contentType = this.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            resolve(this.json())
        }
        resolve(this)
    })
}

async function fetchResource(route, userOptions = {}, form) {
    // Define default options
    const defaultOptions = {
        method: 'GET',
    };
    // Define default headers
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // If we are sending a form, we don't
    // want to use the default content type
    // since it's set automatically
    if (form) {
        delete defaultHeaders["Content-Type"]
    }

    const options = {
        // Merge options
        ...defaultOptions,
        ...userOptions,
        // Merge headers
        headers: {
            ...defaultHeaders,
            ...userOptions.headers,
        },
    };

    return fetch(API_URL + route, options)
        .then(resp => resp.ensureSuccess())
        .catch(error => {
            console.error(error)
            throw error
        })
}

export class Auth {
    static async Login(username, password) {
        let data = {
            username: username,
            password: password,
        }

        return fetchResource("auth/login", {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    static async Logout() {
        return fetchResource("auth/logout")
    }
}

export class FS {
    static async ViewDir(dir) {
        return fetchResource(`fs/${dir}`)
    }

    static async NewFolder(dir, name) {
        const form = new FormData();
        form.append("name", name)
        form.append('type', "folder");

        if (dir === "/") dir = ""
        return fetchResource(`fs/${dir}`, {
            method: 'POST',
            body: form,
        }, true)
    }

    static async NewFiles(dir, files, success, error, progress) {
        // We use an xhr request for file uploading because
        // we want to keep track of the progress of the file
        // upload

        // Create the form
        const form = new FormData();
        form.append('type', "file");
        for (let i = 0; i < files.length; i++) {
            form.append("files", files[i])
        }

        // Create the request
        let xhr = new XMLHttpRequest();
        xhr.addEventListener('loadend', async (e) => {
            if (e.target.status >= 400 && e.target.status <= 500)
                await error(e)
            else
                await success(e)
        });
        xhr.addEventListener('error', error);
        xhr.addEventListener('abort', error);
        xhr.upload.addEventListener('progress', progress);

        // Send the request
        if (dir === "/") dir = ""
        xhr.open('POST', API_URL + `fs/${dir}`);
        xhr.send(form)
    }

    static async DeleteItem(dir) {
        return fetchResource(`fs/${dir}`, {
            method: 'DELETE',
        })
    }

    static async MoveItem(dir, path, mode) {
        let data = {
            mode: mode,
            path: path,
        }

        return fetchResource(`fs/${dir}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
    }
}