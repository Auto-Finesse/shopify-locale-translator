# Shopify Locale Translator Core

This is a core library to interact with different translation APIs to simplify
programmatic translation of Shopify locales.

To view the CLI tool, see the [cli](./cli) directory.
To view the GUI tool, see the [gui](./gui) directory.

## Usage

```js
import { Translator } from "shopify-locale-translator-core";
let translator = new Translator()
    .configure({
        api: "libretranslate",
        // api_key: "",
        // url: "",
    });
let locale = {
    "hello": "Hello",
    "world": "World",
};
let translatedLocale = await translator.translate(locale, "en", "es");
console.log(translatedLocale);
// {
//     "hello": "Hola",
//     "world": "Mundo",
// }
```