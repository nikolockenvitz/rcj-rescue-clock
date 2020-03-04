const pathImageTimeStart = "img/start.svg";
const pathImageTimePause = "img/pause.svg";

const MAXIMUM_MINUTES = 8;
const MAX_RUN_DURATION = MAXIMUM_MINUTES*60;

const FREQUENCY_UPDATE_TIME_IN_MS = 31;

const frequencyShortAlert = 600;
const frequencyLongAlert  = 800;
const durationShortAlert = 200;
const durationLongAlert  = 500;

const BEEP_VOLUME = 4;

let shortBeep = function () {
    beep(frequencyShortAlert, durationShortAlert, BEEP_VOLUME, "sine");
};

let longBeep = function () {
    beep(frequencyLongAlert, durationLongAlert, BEEP_VOLUME, "sine");
    if (Notification.permission == 'granted') {
        navigator.serviceWorker.getRegistration().then(function(reg) {
            let options = {
                body: getRunTimeAsString(),
                vibrate: [durationLongAlert*1.2],
                icon: "img/icon192x192.png",
                badge: "img/icon192x192.png"
            };
            reg.showNotification("Time is over!", options);
        });
    }
};

let annoyingBeep = function () {
    clearAllNotifications();
    beep(1000, 1000, BEEP_VOLUME, "sine");
};

let alerts = [
    { time: MAX_RUN_DURATION - 5, func: shortBeep, finished: false },
    { time: MAX_RUN_DURATION - 4, func: shortBeep, finished: false },
    { time: MAX_RUN_DURATION - 3, func: shortBeep, finished: false },
    { time: MAX_RUN_DURATION - 2, func: shortBeep, finished: false },
    { time: MAX_RUN_DURATION - 1, func: shortBeep, finished: false },
    { time: MAX_RUN_DURATION - 0, func: longBeep, finished: false },
    { time: MAX_RUN_DURATION + 5, func: annoyingBeep, finished: false}
];

let intervalIdTime = null;

let data = {};

const LS_DATA = "rcj-rescue-clock-data";

let getTime = function () {
    return (new Date).getTime() / 1000;
};

let pad = function (value, length, character) {
    if (length === undefined) { length = 2; }
    if (character === undefined) { character = 0; }
    value = String(value);
    return String(character).repeat(Math.max(0, length-value.length)) + value;
};

window.onload = function() {
    loadDataFromLocalStorage();
    initializeMissingData();
    addEventListeners();
    initializeTime();
    disableContextMenuForGraphics();
    updateNotificationButtonInMenu();
};

let loadDataFromLocalStorage = function () {
    data = localStorage.getItem(LS_DATA);
    if (data === null) {
        data = {};
    } else {
        data = JSON.parse(data);
    }
};

let saveDataToLocalStorage = function () {
    localStorage.setItem(LS_DATA, JSON.stringify(data));
};

let initializeMissingData = function () {
    let arr = [ { name: "timeStartedTimestamp", initialValue: null },
                { name: "timeOffset", initialValue: 0 },
    ];
    for (let i=0; i<arr.length; i++) {
        if (data[arr[i].name] === undefined) {
            data[arr[i].name] = arr[i].initialValue;
        }
    }
    saveDataToLocalStorage();
};

let addEventListeners = function () {
    document.getElementById("time-start-pause").addEventListener("click", toggleTimeRunning);
    addEventListenersForTimeModal();
    addEventListenersForMenu();
};

let addEventListenersForTimeModal = function () {
    document.getElementById("time-modal-close").addEventListener("click", hideTimeModal);
    window.onclick = (event) => {
        if (event.target === document.getElementById("time-modal")) {
            hideTimeModal();
        }
    };
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideTimeModal();
        }
    });
    document.getElementById("time-modal-save").addEventListener("click", saveTimeFromTimeModal);
    let tmm = document.getElementById("time-modal-minutes");
    tmm.addEventListener("input", onInputTimeModalMinutes);
    tmm.addEventListener("change", makeTimeDoubleDigit);
    tmm.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") { onClickTimeModalMinutesPlus(); }
        else if (e.key === "ArrowDown") { onClickTimeModalMinutesMinus(); }
    });
    tmm.parentNode.parentNode.childNodes[1].addEventListener("click", onClickTimeModalMinutesPlus);
    tmm.parentNode.parentNode.childNodes[5].addEventListener("click", onClickTimeModalMinutesMinus);
    let tms = document.getElementById("time-modal-seconds");
    tms.addEventListener("input", onInputTimeModalSeconds);
    tms.addEventListener("change", makeTimeDoubleDigit);
    tms.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") { onClickTimeModalSecondsPlus(); }
        else if (e.key === "ArrowDown") { onClickTimeModalSecondsMinus(); }
    });
    tms.parentNode.parentNode.childNodes[1].addEventListener("click", onClickTimeModalSecondsPlus);
    tms.parentNode.parentNode.childNodes[5].addEventListener("click", onClickTimeModalSecondsMinus);
    makeTimeDoubleDigit();
};

let isTimeRunning = function () {
    return data.timeStartedTimestamp !== null;
};

let startAutoUpdatingTime = function () {
    stopAutoUpdatingTime();
    intervalIdTime = setInterval(updateTime, FREQUENCY_UPDATE_TIME_IN_MS);
};

let stopAutoUpdatingTime = function () {
    if (intervalIdTime !== null) {
        clearInterval(intervalIdTime);
        intervalIdTime = null;
    }
};

let setIconsForTimeRunning = function () {
    document.getElementById("time-start-pause").src = pathImageTimePause;
};

let setIconsForTimePaused = function () {
    document.getElementById("time-start-pause").src = pathImageTimeStart;
};

let toggleTimeRunning = function () {
    let time = getTime();
    if (!isTimeRunning()) { // time currently paused -> start time
        data.timeStartedTimestamp = time;
        setIconsForTimeRunning();
        startAutoUpdatingTime();
    }
    else { // time currently running -> pause time
        data.timeOffset = data.timeOffset + time - data.timeStartedTimestamp;
        data.timeStartedTimestamp = null;
        setIconsForTimePaused();
        stopAutoUpdatingTime();
        updateTime();
    }
    saveDataToLocalStorage();
};

let getRunTimeInSeconds = function () {
    let time = data.timeOffset;
    if (data.timeStartedTimestamp !== null) {
        time += getTime() - data.timeStartedTimestamp;
    }
    return time;
};

let updateTime = function () {
    checkForAlerts();
    document.getElementById("elapsed-time").innerText = getRunTimeAsString();
    document.getElementById("remaining-time").innerText = getRemainingTimeAsString();
    showMilliseconds();
};

let getRunTimeAsString = function () {
    return getSecondsAsTimeString(getRunTimeInSeconds());
};

let getRemainingTimeAsString = function () {
    let time = MAX_RUN_DURATION - Math.floor(getRunTimeInSeconds());
    return (time < 0 ? "-" : "") + getSecondsAsTimeString(Math.abs(time));
};

let getSecondsAsTimeString = function (timeInSeconds) {
    let minutes = pad(Math.floor(timeInSeconds/60));
    let seconds = pad(Math.floor(timeInSeconds%60));
    return minutes + ":" + seconds;
};

let showMilliseconds = function () {
    let ms = Math.round((1000 * getRunTimeInSeconds())%1000);
    document.getElementById("elapsed-time-ms").innerText = pad(ms, 3);
};

let resetTime = function () {
    stopAutoUpdatingTime()
    data.timeOffset = 0.0;
    data.timeStartedTimestamp = null;
    saveDataToLocalStorage();
    
    resetAlerts();
    updateTime();
    setIconsForTimePaused();
};

let btnResetTime = function () {
    if (confirm("Are you sure to reset the time? You can't undo this step.")) {
        resetTime();
        hideTimeModal();
        clearAllNotifications();
    }
};

let btnSetTime = function () {
    let time = getRunTimeInSeconds();
    document.getElementById("time-modal-minutes").value = Math.floor(time/60);
    document.getElementById("time-modal-seconds").value = Math.floor(time%60);
    makeTimeDoubleDigit();
    showTimeModal();
};

let initializeTime = function () {
    updateTime();
    if (isTimeRunning()) {
        startAutoUpdatingTime();
        setIconsForTimeRunning();
    } else {
        setIconsForTimePaused();
    }
};

let checkForAlerts = function () {
    if (!isTimeRunning()) { return; }
    let time = getRunTimeInSeconds();
    let diff;
    for (let i=0; i<alerts.length; i++) {
        diff = time - alerts[i].time;
        if (diff > 0 && diff < 1 && alerts[i].finished === false) {
            alerts[i].func();
            alerts[i].finished = true;
        }
    }
};

let resetAlerts = function () {
    for (let i=0; i<alerts.length; i++) {
        alerts[i].finished = false;
    }
};


// Time Modal
let onInputTimeModalMinutes = function (e) {
    let el = document.getElementById("time-modal-minutes");
    if (e.inputType === "insertText" && !["0","1","2","3","4","5","6","7","8","9"].includes(e.data)) {
        let value = "";
        for (let c of el.value) {
            if (["0","1","2","3","4","5","6","7","8","9"].includes(c)) {
                value += String(c);
            }
        }
        el.value = value;
        return;
    }
    if (el.value < 0) {
        el.value = 0;
        document.getElementById("time-modal-seconds").value = 0;
    } else if (el.value > 7) {
        el.value = 8;
        document.getElementById("time-modal-seconds").value = 0;
    }
};

let onInputTimeModalSeconds = function (e) {
    let el = document.getElementById("time-modal-seconds");
    if (e.inputType === "insertText" && !["0","1","2","3","4","5","6","7","8","9"].includes(e.data)) {
        let value = "";
        for (let c of el.value) {
            if (["0","1","2","3","4","5","6","7","8","9"].includes(c)) {
                value += String(c);
            }
        }
        el.value = value;
        return;
    }
    if (el.value < 0) {
        el.value = 0;
    } else if (el.value > 59) {
        onClickTimeModalMinutesPlus();
        el.value = el.value%60;
    }
};

let onClickTimeModalMinutesPlus = function () {
    let el = document.getElementById("time-modal-minutes");
    el.value = Number(el.value) + 1;
    if (el.value >= MAXIMUM_MINUTES) {
        el.value = MAXIMUM_MINUTES;
        document.getElementById("time-modal-seconds").value = 0;
    }
    makeTimeDoubleDigit();
};

let onClickTimeModalMinutesMinus = function () {
    let el = document.getElementById("time-modal-minutes");
    el.value = Number(el.value) - 1;
    if (el.value < 0) {
        el.value = 0;
        document.getElementById("time-modal-seconds").value = 0;
    }
    makeTimeDoubleDigit();
};

let onClickTimeModalSecondsPlus = function () {
    let el = document.getElementById("time-modal-seconds");
    el.value = Number(el.value) + 1;
    if (document.getElementById("time-modal-minutes").value >= MAXIMUM_MINUTES) {
        el.value = 0;
    } else if (el.value > 59) {
        el.value = 0;
        onClickTimeModalMinutesPlus();
    }
    makeTimeDoubleDigit();
};

let onClickTimeModalSecondsMinus = function () {
    let el = document.getElementById("time-modal-seconds");
    el.value = Number(el.value) - 1;
    if (el.value < 0) {
        el.value = 59;
        onClickTimeModalMinutesMinus();
    }
    makeTimeDoubleDigit();
};

let makeTimeDoubleDigit = function () {
    let tmm = document.getElementById("time-modal-minutes");
    let tms = document.getElementById("time-modal-seconds");
    tmm.value = pad(tmm.value).slice(-2);
    tms.value = pad(tms.value).slice(-2);
};

let saveTimeFromTimeModal = function () {
    let minutes = Number(document.getElementById("time-modal-minutes").value);
    let seconds = Number(document.getElementById("time-modal-seconds").value);
    let newRunTimeInSeconds = minutes*60 + seconds;
    data.timeOffset += newRunTimeInSeconds - getRunTimeInSeconds();
    saveDataToLocalStorage();
    resetAlerts();
    updateTime();
    hideTimeModal();
    clearAllNotifications();
};

let hideTimeModal = function () {
    document.getElementById("time-modal").style.display = "none";
};
let showTimeModal = function () {
    document.getElementById("time-modal").style.display = "block";
    document.getElementById("time-modal-seconds").focus();
};

let disableContextMenuForGraphics = function () {
    let elementIds = ["time-start-pause"];
    for (let elementId of elementIds) {
        document.getElementById(elementId).addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });
    }
};

let addEventListenersForMenu = function () {
    document.getElementById("kebab-menu-icon").addEventListener("click", showMenu);
    document.getElementById("menu-close").addEventListener("click", hideMenu);

    document.getElementById("btn-notifications").addEventListener("click", onClickBtnNotifications);
};

let showMenu = function () {
    document.getElementById("menu").style.display = "block";
};

let hideMenu = function () {
    document.getElementById("menu").style.display = "none";
};

let updateNotificationButtonInMenu = function () {
    if ('Notification' in window && navigator.serviceWorker) {
        document.getElementById("btn-notifications").disabled = false;
    }
};

let onClickBtnNotifications = function () {
    Notification.requestPermission(function(status) {
        document.getElementById("debug-text").innerText = status;
    });
};

let clearAllNotifications = function () {
    navigator.serviceWorker.getRegistration().then(function(reg) {
        reg.getNotifications().then(function(notifications) {
            for (let notification of notifications) {
                notification.close();
            }
        });
    });
};


// Sounds
audioCtx = new(window.AudioContext || window.webkitAudioContext)();

let beep = function (frequency, duration, volume, type) {
    let oscillator = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.value = volume;
    oscillator.frequency.value = frequency;
    oscillator.type = type;

    oscillator.start();

    setTimeout(function() {
        oscillator.stop();
    }, duration);
};


// Service Worker for PWA
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.log(error);
    });
} else {
    console.log("ServiceWorker not supported");
}
