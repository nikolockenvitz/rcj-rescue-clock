const varFontSizeConfig = [
  {
    description: "Time Inputs",
    className: "var-font-size-time-input",
    baseFontSizeInEm: 2,
    optionsInPercent: [50, 75, 100, 125, 150, 175, 200, 250, 300],
  },
  {
    description: "Buttons",
    className: "var-font-size-btn",
    baseFontSizeInEm: 1.5,
    optionsInPercent: [50, 75, 100, 125, 150, 175, 200],
  },
];

const LS_FONT_SIZE_DATA = "rcj-rescue-clock-font-sizes";

function setup() {
  readFontSizesFromLocalstorage();
  updateCss();
  initControls();
}
setup();

function readFontSizesFromLocalstorage() {
  const data = localStorage.getItem(LS_FONT_SIZE_DATA);
  if (data !== null) {
    try {
      const parsedData = JSON.parse(data);
      for (const key of Object.keys(parsedData)) {
        const varFontSizeConfigEntry = varFontSizeConfig.find(
          (entry) => entry.className === key
        );
        if (
          varFontSizeConfigEntry &&
          varFontSizeConfigEntry.optionsInPercent.includes(parsedData[key])
        ) {
          varFontSizeConfigEntry.value = parsedData[key];
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

function saveFontSizesToLocalStorage() {
  const data = {};
  for (const varFontSizeConfigEntry of varFontSizeConfig) {
    if (varFontSizeConfigEntry.value && varFontSizeConfigEntry.value !== 100) {
      data[varFontSizeConfigEntry.className] = varFontSizeConfigEntry.value;
    }
  }
  localStorage.setItem(LS_FONT_SIZE_DATA, JSON.stringify(data));
}

function updateCss(configEntry = undefined) {
  const configEntries = configEntry ? [configEntry] : varFontSizeConfig;
  for (const varFontSizeConfigEntry of configEntries) {
    const value = varFontSizeConfigEntry.value || 100;
    const fontSizeInEm =
      (varFontSizeConfigEntry.baseFontSizeInEm * value) / 100;
    // const cssRule = `.${varFontSizeConfigEntry.className} { font-size: ${fontSizeInEm}em; }`;
    // css.sheet.insertRule(cssRule);
    const elements = document.querySelectorAll(
      "." + varFontSizeConfigEntry.className
    );
    for (const element of elements) {
      element.style.fontSize = fontSizeInEm + "em";
    }
  }
}

function initControls() {
  const divControls = document.getElementById("var-font-size-controls");
  for (const varFontSizeConfigEntry of varFontSizeConfig) {
    const description = document.createElement("p");
    description.innerText = varFontSizeConfigEntry.description;
    description.style = "margin-bottom: 0.5em;";
    divControls.appendChild(description);

    const divControl = document.createElement("div");
    divControl.style =
      "display: flex; justify-content: center; font-size: 1.5em;";
    divControls.appendChild(divControl);

    const cssPlusMinus =
      "width: 2em; color: #fff; background: #fd5e53; padding: 8px 0;";
    const divControlMinus = document.createElement("div");
    divControlMinus.innerText = "-";
    divControlMinus.style = cssPlusMinus;
    divControl.appendChild(divControlMinus);

    const divControlText = document.createElement("div");
    divControlText.innerText = (varFontSizeConfigEntry.value || 100) + " %";
    divControlText.style =
      "min-width: 3em; background: #fff; color: #000; padding: 8px 16px;";
    divControl.appendChild(divControlText);

    const divControlPlus = document.createElement("div");
    divControlPlus.innerText = "+";
    divControlPlus.style = cssPlusMinus;
    divControl.appendChild(divControlPlus);

    function addPlusMinusClickEventListener(element, type) {
      element.addEventListener("click", (event) => {
        console.log("click");
        let newValue = 100;
        const curIndex = varFontSizeConfigEntry.optionsInPercent.findIndex(
          (option) => option === (varFontSizeConfigEntry.value || 100)
        );
        let newIndex = curIndex + (type === "plus" ? 1 : -1);
        newIndex = Math.max(
          0,
          Math.min(varFontSizeConfigEntry.optionsInPercent.length - 1, newIndex)
        );
        newValue = varFontSizeConfigEntry.optionsInPercent[newIndex];
        varFontSizeConfigEntry.value = newValue;
        divControlText.innerText = newValue + " %";
        updateCss(varFontSizeConfigEntry);
        saveFontSizesToLocalStorage();
      });
    }
    addPlusMinusClickEventListener(divControlMinus, "minus");
    addPlusMinusClickEventListener(divControlPlus, "plus");
  }
}
