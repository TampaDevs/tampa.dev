import Handlebars from 'handlebars/runtime.js';
import {
    registerAsyncHelper
} from "hbs-async-render";

import * as util from './utils.js';

export function registerAll() {
    registerAsyncHelper(Handlebars, 'capitalize', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(options.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase()));
        });
    });

    registerAsyncHelper(Handlebars, 'photo_url', async function (primaryPhoto, fallbackPhoto) {
        const p = primaryPhoto || fallbackPhoto || null;
        const url = util.photoUrl(p);
        if (!url) return '';
        return url;
    });

    registerAsyncHelper(Handlebars, 'add_utm', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(options + "?utm_source=td_events_api_widget&utm_medium=organic&utm_campaign=td_events_api_widget_embed");
        });
    });

    registerAsyncHelper(Handlebars, 'truncate', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(options.replace(/^(.{32}[^\s]*).*/, "$1") + "...");
        });
    });

    registerAsyncHelper(Handlebars, 'to_local_date', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(util.toLocalDate(options));
        });
    });

    registerAsyncHelper(Handlebars, 'render_short_description', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(util.markdownToHtml(util.trunc(options, 100)));
        });
    });

    registerAsyncHelper(Handlebars, 'render_long_description', function (options, context) {
        return new Promise((resolve, reject) => {
            resolve(util.markdownToHtml(options));
        });
    });
}
