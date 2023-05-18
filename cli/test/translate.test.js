import cli from "../src/main.mjs";

test('Translates locales/en.default.json to locales/es.json', async () => {
    let result = await cli.parseAsync([
        "translate",
        "-i",
        "test/locales/en.default.json",
        "-o",
        "test/locales/es.json",
        "--from",
        "en",
        "--to",
        "es",
        "--no-spinner"
    ], {
        from: "user"
    });
    // ????
}, 15000)