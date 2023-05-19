import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";

async function getOriginLanguages(forceReload: boolean = false): Promise<string[]> {
    let result: string[] | undefined;
    return (async () => {
        if (result !== undefined && !forceReload) {
            return result;
        }
        result = await invoke<string[]>("get_origin_languages");
        return result;
    })();
}

function updateTranslateButton() {
    let translateButton = document.getElementById("translate_button") as HTMLButtonElement;
    // Check if there's an origin language selected
    let originLanguage = (document.querySelector("input[name=origin_language_file]:checked") as HTMLInputElement).value;
    if (originLanguage === "") {
        translateButton.disabled = true;
        return {allowed: false};
    }
    // Check if there's at least one target language selected
    let selectedTargetLanguages = document.querySelectorAll("input[name=target_language_file]:checked");
    if (selectedTargetLanguages.length === 0) {
        translateButton.disabled = true;
        return {allowed: false};
    }
    let targetLanguages = [];
    for (let i = 0; i < selectedTargetLanguages.length; i++) {
        targetLanguages.push((selectedTargetLanguages[i] as HTMLInputElement).value);
    }
    translateButton.disabled = false;
    return {allowed: true, originLanguage, targetLanguages};
}

async function translate() {
    let {allowed, originLanguage, targetLanguages} = updateTranslateButton();
    if (!allowed) {
        alert("Please select an origin language and at least one target language.");
        return false;
    }
    let translateContainer = document.getElementById("translate_container");
    let button = document.getElementById("translate_button") as HTMLButtonElement;
    translateContainer.classList.add("is-loading");
    button.disabled = true;
    let timePassedElement = document.getElementById("time_passed");
    let timePassed = 0;
    let timePassedInterval = setInterval(() => {
        timePassed++;
        timePassedElement.textContent = getHumanTime(timePassed);
    }, 1000);
    // Translate
    let result;
    try {
        result = await invoke("translate", {originLanguage: originLanguage, targetLanguages: targetLanguages});
    } catch (e) {
        alert(e);
        translateContainer.classList.remove("is-loading");
        button.disabled = false;
        clearInterval(timePassedInterval);
        return false;
    }
    alert("Translation successful!");
    translateContainer.classList.remove("is-loading");
    button.disabled = false;
    clearInterval(timePassedInterval);
    console.log(result);
    return true;
}

async function handleOriginLanguageChange() {
    // Ask rust to infer the target language
    let originLanguage = (document.querySelector("input[name=origin_language_file]:checked") as HTMLInputElement).value;
    let targetLanguage;
    try {
        targetLanguage = await invoke<string>("infer_target_language", {fileName: originLanguage});
    } catch (e) {
        alert(e);
        return false;
    }
    let originLanguageInput = document.getElementById("origin_language") as HTMLInputElement;
    originLanguageInput.value = targetLanguage;
    updateTranslateButton();
}

async function handleTargetLanguageChange() {
    // Update the time estimate per file
    let file = (document.querySelector("input[name=origin_language_file]:checked") as HTMLInputElement).value;
    let perLanguageTimeEstimate = await invoke<number>("get_per_language_time_estimate", {fileName: file});
    let timeEstimateSpan = document.getElementById("time_estimate");
    let selectedTargetLanguages = document.querySelectorAll("input[name=target_language_file]:checked");
    let timeEstimate = selectedTargetLanguages.length * perLanguageTimeEstimate;
    timeEstimateSpan.textContent = getHumanTime(timeEstimate);
    updateTranslateButton();
}

/**
 * Calculate time estimate in human readable format
 */
function getHumanTime(seconds: number): string {
    let timeString = "";
    if (seconds > 60) {
        let minutes = Math.floor(seconds / 60);
        timeString += minutes + "m";
    }
    let remainingSeconds = seconds % 60;
    timeString += remainingSeconds + "s";
    return timeString;
}

async function reloadLanguages() {
    // Force reload the languages
    let originLanguages = await getOriginLanguages(true);
    // Update the origin language radio buttons
    let originLanguageRadioContainer = document.getElementById("origin_language_file");
    originLanguageRadioContainer.innerHTML = "";
    let originTemplate = document.getElementById("origin_language_template");
    originTemplate = originTemplate.firstElementChild as HTMLElement;
    for (let i = 0; i < originLanguages.length; i++) {
        let div = originTemplate.cloneNode(true) as HTMLElement;
        let input = div.querySelector("input") as HTMLInputElement;
        input.value = originLanguages[i];
        let label = div.querySelector(".name") as HTMLLabelElement;
        label.textContent = originLanguages[i];
        // If the language has .default. in it, check it by default
        if (originLanguages[i].includes(".default") && !originLanguages[i].includes(".schema")) {
            input.checked = true;
        }
        originLanguageRadioContainer.appendChild(div);
    }
    // Update the target language checkboxes
    let targetLanguageCheckboxContainer = document.getElementById("target_language_file");
    targetLanguageCheckboxContainer.innerHTML = "";
    let targetTemplate = document.getElementById("target_language_template");
    for (let i = 0; i < originLanguages.length; i++) {
        let div = targetTemplate.cloneNode(true) as HTMLElement;
        let input = div.querySelector("input") as HTMLInputElement;
        input.value = originLanguages[i];
        let label = div.querySelector(".name") as HTMLLabelElement;
        label.textContent = originLanguages[i];
        targetLanguageCheckboxContainer.appendChild(div);
    }
}

async function setupLanguageSelects() {
    // Load the languages
    await reloadLanguages();
    // Update the language selected
    await handleOriginLanguageChange();
    // Add event listeners
    let originLanguageRadioContainer = document.getElementById("origin_language_file");
    let targetLanguageCheckboxContainer = document.getElementById("target_language_file");
    originLanguageRadioContainer.addEventListener("change", handleOriginLanguageChange);
    targetLanguageCheckboxContainer.addEventListener("change", handleTargetLanguageChange);
    return true;
}

function setupTranslateButton() {
    let translateButton = document.getElementById("translate_button") as HTMLButtonElement;
    translateButton.addEventListener("click", translate);
}

async function handleLocaleDirButtonClick() {
    // Get the file from the input type=file
    let localeDir = await open();
    if (!localeDir) {
        alert("No file selected.")
        return false;
    }
    if (Array.isArray(localeDir)) {
        localeDir = localeDir[0];
    }
    try {
        localeDir = await invoke<string>("set_locale_dir", {filePath: localeDir});
        await reloadLanguages();
    } catch (e) {
        alert(e);
        return false;
    }
    let localesDirEle = document.getElementById("locales_dir") as HTMLElement;
    localesDirEle.textContent = localeDir;
    alert("Locale directory set successfully!")
    return true;
}

async function setupLocaleDirInput() {
    let localesDirButton = document.getElementById("locales_dir_button") as HTMLButtonElement;
    localesDirButton.addEventListener("click", handleLocaleDirButtonClick);
    let localesDir;
    try {
        localesDir = await invoke<string>("get_locale_dir");
    } catch (e) {
        alert(e);
        return false;
    }
    localesDirButton.value = localesDir;
}

window.addEventListener("DOMContentLoaded", async () => {
    await setupLanguageSelects();
    setupTranslateButton();
    await setupLocaleDirInput();
});
