export const name = 'login';

import * as API from "/static/js/api.js"

export default function () {
    return {
        username: '',
        password: '',
        response: '',

        password_field: {
            async ['@keyup.enter']() {
                await this.login()
            },
        },
        login_btn: {
            async ['@click']() {
                await this.login()
            },
        },

        async login() {
            await API.Auth.Login(this.username, this.password)
                .then(() => {
                    window.location.replace('/fs')
                })
                .catch(() => {
                    this.response = 'Failed'
                })
        },
    }
}