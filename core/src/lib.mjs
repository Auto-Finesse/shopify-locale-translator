/**
 * @typedef {Object} API
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {Object} params
 * @property {string} action
 * @property {string} result
 */
/**
 * @type {API[]}
 */
const APIS = [
    {
        id: "google",
        name: "Google",
        url: "https://translation.googleapis.com/language/translate/v2",
        params: {
            api_key: "key",
            q: "q",
            source: "source",
            target: "target",
            format: "format"
        },
        action: "POST",
        result: "translations.0.translatedText"
    },
    {
        id: "yandex",
        name: "Yandex",
        url: "https://translate.yandex.net/api/v1.5/tr.json/translate",
        params: {
            api_key: "key",
            q: "text",
            source: "lang",
            target: "lang",
            format: "format"
        },
        action: "GET",
        result: "text.0"
    },
    {
        id: "libretranslate",
        name: "LibreTranslate",
        url: "https://libretranslate.com/translate",
        params: {
            api_key: "api_key",
            q: "q",
            source: "source",
            target: "target",
            format: "format"
        },
        action: "POST",
        result: "translatedText"
    }
];

/**
 * @typedef {Object} TranslatorConfig
 * @property {string} api - The id of the API to use, see {@link APIS}
 * @property {?string} api_key
 * @property {?string} url
 */

/**
 * @class Translator
 * @property {string} api - The id of the API to use, see {@link APIS}
 * @property {?string} api_key
 * @property {?string} url
 */
class Translator {
    /**
     * @param config {TranslatorConfig}
     * @returns {Translator}
     */
    configure(config) {
        this.api = config.api;
        this.api_key = config.api_key;
        this.url = config.url;
        return this;
    }

    useUrl(url) {
        this.url = url;
        return this;
    }

    async translate(localeJSON, from, to) {
        // Walk through the JSON and translate each string
        let result = {};
        let keys = Object.keys(localeJSON);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = localeJSON[key];
            if (typeof value === "string") {
                // Replace {{ template }} in string with an identifier and add the {{ template }} to a map
                let variableMap = new Map();
                if (value.includes("{") && value.includes("}")) {
                    let variableRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
                    let match;
                    let id = 1;
                    while ((match = variableRegex.exec(value)) !== null) {
                        let variable = match[0];
                        let identifier = "$" + id + "";
                        variableMap.set(identifier, variable);
                        value = value.replace(variable, identifier);
                        id++;
                    }
                }
                let translatedValue;
                if (value.includes("<") && value.includes(">")) {
                    translatedValue = await this.translateText(value, from, to, "html");
                } else {
                    translatedValue = await this.translateText(value, from, to, "text");
                }
                // Add the {{ template }} back to the translated string
                for (let [identifier, variable] of variableMap) {
                    translatedValue = translatedValue.replace(identifier, variable);
                }
                result[key] = translatedValue;
            } else if (typeof value === "object") {
                result[key] = await this.translate(value, from, to);
            }
        }
        return result;
    }

    async translateText(content, from, to, format = "text") {
        let api = APIS.find(api => api.id === this.api);
        if (!api) {
            throw new Error("Invalid API");
        }
        let url = api.url;
        if (this.url) {
            url = this.url;
        }
        if (!url) {
            throw new Error(`Invalid URL for API ${api.name} (${api.id}) - ${url}`);
        }
        let params = api.params;
        let data = {
            [params.key]: this.api_key,
            [params.q]: content,
            [params.source]: from,
            [params.target]: to,
            [params.format]: format
        };
        let response = await fetch(url, {
            method: api.action,
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });
        let json = await response.json();
        if (json.error) {
            throw new Error(json.error);
        }
        let result = json;
        // Walk through the result object and get the result
        // This is because the result is in a different place for each API
        api.result.split(".").forEach(key => {
            result = result[key];
        });
        return result;
    }
}

export default Translator;
export {
    Translator,

}