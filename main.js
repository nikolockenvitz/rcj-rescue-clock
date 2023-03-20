const pathImageTimeStart = "img/start.svg";
const pathImageTimePause = "img/pause.svg";

const MAXIMUM_MINUTES = 8;
const MAX_RUN_DURATION = MAXIMUM_MINUTES * 60;

const FREQUENCY_UPDATE_TIME_IN_MS = 31;

const frequencyShortAlert = 600;
const frequencyLongAlert = 800;
const durationShortAlert = 200;
const durationLongAlert = 500;

const BEEP_VOLUME = 4;

function shortBeep() {
  beep(frequencyShortAlert, durationShortAlert, BEEP_VOLUME, "sine");
}

function longBeep() {
  beep(frequencyLongAlert, durationLongAlert, BEEP_VOLUME, "sine");
  if (Notification.permission == "granted") {
    const notification = new Notification("Time is over!", {
      body: getRunTimeAsString(),
      vibrate: [durationLongAlert * 1.2],
      icon: "img/icon192x192.png",
      badge: "img/icon192x192.png",
    });
    notification.onclick = function (event) {
      window.focus();
    };
  }
}

function annoyingBeep() {
  clearAllNotifications();
  beep(1000, 1000, BEEP_VOLUME, "sine");
}

const alerts = [
  { time: MAX_RUN_DURATION - 5, func: shortBeep, finished: false },
  { time: MAX_RUN_DURATION - 4, func: shortBeep, finished: false },
  { time: MAX_RUN_DURATION - 3, func: shortBeep, finished: false },
  { time: MAX_RUN_DURATION - 2, func: shortBeep, finished: false },
  { time: MAX_RUN_DURATION - 1, func: shortBeep, finished: false },
  { time: MAX_RUN_DURATION - 0, func: longBeep, finished: false },
  { time: MAX_RUN_DURATION + 5, func: annoyingBeep, finished: false },
];

let intervalIdTime = null;

let data = {};

const LS_DATA = "rcj-rescue-clock-data";

function getTime() {
  return new Date().getTime() / 1000;
}

function pad(value, length, character) {
  if (length === undefined) {
    length = 2;
  }
  if (character === undefined) {
    character = 0;
  }
  value = String(value);
  return String(character).repeat(Math.max(0, length - value.length)) + value;
}

window.onload = () => {
  loadDataFromLocalStorage();
  initializeMissingData();
  addEventListeners();
  initializeTime();
  disableContextMenuForGraphics();
  updateNotificationButtonInMenu();
  updateVersionOnInfoPage();
};

function loadDataFromLocalStorage() {
  data = localStorage.getItem(LS_DATA);
  if (data === null) {
    data = {};
  } else {
    data = JSON.parse(data);
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem(LS_DATA, JSON.stringify(data));
}

function initializeMissingData() {
  const arr = [
    { name: "timeStartedTimestamp", initialValue: null },
    { name: "timeOffset", initialValue: 0 },
  ];
  for (let i = 0; i < arr.length; i++) {
    if (data[arr[i].name] === undefined) {
      data[arr[i].name] = arr[i].initialValue;
    }
  }
  saveDataToLocalStorage();
}

function addEventListeners() {
  document
    .getElementById("time-start-pause")
    .addEventListener("click", toggleTimeRunning);
  addEventListenersForTimeModal();
  addEventListenersForMenu();
  addEventListenersForInfoPage();
}

function addEventListenersForTimeModal() {
  document
    .getElementById("time-modal-close")
    .addEventListener("click", hideTimeModal);
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
  document
    .getElementById("time-modal-save")
    .addEventListener("click", saveTimeFromTimeModal);
  const tmm = document.getElementById("time-modal-minutes");
  tmm.addEventListener("input", onInputTimeModalMinutes);
  tmm.addEventListener("change", makeTimeDoubleDigit);
  tmm.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      onClickTimeModalMinutesPlus();
    } else if (e.key === "ArrowDown") {
      onClickTimeModalMinutesMinus();
    }
  });
  tmm.parentNode.parentNode.childNodes[1].addEventListener(
    "click",
    onClickTimeModalMinutesPlus
  );
  tmm.parentNode.parentNode.childNodes[5].addEventListener(
    "click",
    onClickTimeModalMinutesMinus
  );
  const tms = document.getElementById("time-modal-seconds");
  tms.addEventListener("input", onInputTimeModalSeconds);
  tms.addEventListener("change", makeTimeDoubleDigit);
  tms.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      onClickTimeModalSecondsPlus();
    } else if (e.key === "ArrowDown") {
      onClickTimeModalSecondsMinus();
    }
  });
  tms.parentNode.parentNode.childNodes[1].addEventListener(
    "click",
    onClickTimeModalSecondsPlus
  );
  tms.parentNode.parentNode.childNodes[5].addEventListener(
    "click",
    onClickTimeModalSecondsMinus
  );
  makeTimeDoubleDigit();
}

function isTimeRunning() {
  return data.timeStartedTimestamp !== null;
}

function startAutoUpdatingTime() {
  stopAutoUpdatingTime();
  intervalIdTime = setInterval(updateTime, FREQUENCY_UPDATE_TIME_IN_MS);
}

function stopAutoUpdatingTime() {
  if (intervalIdTime !== null) {
    clearInterval(intervalIdTime);
    intervalIdTime = null;
  }
}

function setIconsForTimeRunning() {
  document.getElementById("time-start-pause").src = pathImageTimePause;
}

function setIconsForTimePaused() {
  document.getElementById("time-start-pause").src = pathImageTimeStart;
}

function toggleTimeRunning() {
  const time = getTime();
  if (!isTimeRunning()) {
    // time currently paused -> start time
    data.timeStartedTimestamp = time;
    setIconsForTimeRunning();
    startAutoUpdatingTime();
  } else {
    // time currently running -> pause time
    data.timeOffset = data.timeOffset + time - data.timeStartedTimestamp;
    data.timeStartedTimestamp = null;
    setIconsForTimePaused();
    stopAutoUpdatingTime();
    updateTime();
  }
  saveDataToLocalStorage();
}

function getRunTimeInSeconds() {
  let time = data.timeOffset;
  if (data.timeStartedTimestamp !== null) {
    time += getTime() - data.timeStartedTimestamp;
  }
  return time;
}

function updateTime() {
  checkForAlerts();
  document.getElementById("elapsed-time").innerText = getRunTimeAsString();
  document.getElementById("remaining-time").innerText =
    getRemainingTimeAsString();
  showMilliseconds();
}

function getRunTimeAsString() {
  return getSecondsAsTimeString(getRunTimeInSeconds());
}

function getRemainingTimeAsString() {
  const time = MAX_RUN_DURATION - Math.floor(getRunTimeInSeconds());
  return (time < 0 ? "-" : "") + getSecondsAsTimeString(Math.abs(time));
}

function getSecondsAsTimeString(timeInSeconds) {
  const minutes = pad(Math.floor(timeInSeconds / 60));
  const seconds = pad(Math.floor(timeInSeconds % 60));
  return minutes + ":" + seconds;
}

function showMilliseconds() {
  const ms = Math.round((1000 * getRunTimeInSeconds()) % 1000);
  document.getElementById("elapsed-time-ms").innerText = pad(ms, 3);
}

function resetTime() {
  stopAutoUpdatingTime();
  data.timeOffset = 0.0;
  data.timeStartedTimestamp = null;
  saveDataToLocalStorage();

  resetAlerts();
  updateTime();
  setIconsForTimePaused();
}

function btnResetTime() {
  if (confirm("Are you sure to reset the time? You can't undo this step.")) {
    resetTime();
    hideTimeModal();
    clearAllNotifications();
  }
}

function btnSetTime() {
  const time = getRunTimeInSeconds();
  document.getElementById("time-modal-minutes").value = Math.floor(time / 60);
  document.getElementById("time-modal-seconds").value = Math.floor(time % 60);
  makeTimeDoubleDigit();
  showTimeModal();
}

function initializeTime() {
  updateTime();
  if (isTimeRunning()) {
    startAutoUpdatingTime();
    setIconsForTimeRunning();
  } else {
    setIconsForTimePaused();
  }
}

function checkForAlerts() {
  if (!isTimeRunning()) {
    return;
  }
  const time = getRunTimeInSeconds();
  let diff;
  for (let i = 0; i < alerts.length; i++) {
    diff = time - alerts[i].time;
    if (diff > 0 && diff < 1 && alerts[i].finished === false) {
      alerts[i].func();
      alerts[i].finished = true;
    }
  }
}

function resetAlerts() {
  for (let i = 0; i < alerts.length; i++) {
    alerts[i].finished = false;
  }
}

// Time Modal
function onInputTimeModalMinutes(e) {
  const el = document.getElementById("time-modal-minutes");
  if (
    e.inputType === "insertText" &&
    !["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(e.data)
  ) {
    let value = "";
    for (const c of el.value) {
      if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(c)) {
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
}

function onInputTimeModalSeconds(e) {
  const el = document.getElementById("time-modal-seconds");
  if (
    e.inputType === "insertText" &&
    !["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(e.data)
  ) {
    let value = "";
    for (const c of el.value) {
      if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(c)) {
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
    el.value = el.value % 60;
  }
}

function onClickTimeModalMinutesPlus() {
  const el = document.getElementById("time-modal-minutes");
  el.value = Number(el.value) + 1;
  if (el.value >= MAXIMUM_MINUTES) {
    el.value = MAXIMUM_MINUTES;
    document.getElementById("time-modal-seconds").value = 0;
  }
  makeTimeDoubleDigit();
}

function onClickTimeModalMinutesMinus() {
  const el = document.getElementById("time-modal-minutes");
  el.value = Number(el.value) - 1;
  if (el.value < 0) {
    el.value = 0;
    document.getElementById("time-modal-seconds").value = 0;
  }
  makeTimeDoubleDigit();
}

function onClickTimeModalSecondsPlus() {
  const el = document.getElementById("time-modal-seconds");
  el.value = Number(el.value) + 1;
  if (document.getElementById("time-modal-minutes").value >= MAXIMUM_MINUTES) {
    el.value = 0;
  } else if (el.value > 59) {
    el.value = 0;
    onClickTimeModalMinutesPlus();
  }
  makeTimeDoubleDigit();
}

function onClickTimeModalSecondsMinus() {
  const el = document.getElementById("time-modal-seconds");
  el.value = Number(el.value) - 1;
  if (el.value < 0) {
    el.value = 59;
    onClickTimeModalMinutesMinus();
  }
  makeTimeDoubleDigit();
}

function makeTimeDoubleDigit() {
  const tmm = document.getElementById("time-modal-minutes");
  const tms = document.getElementById("time-modal-seconds");
  tmm.value = pad(tmm.value).slice(-2);
  tms.value = pad(tms.value).slice(-2);
}

function saveTimeFromTimeModal() {
  const minutes = Number(document.getElementById("time-modal-minutes").value);
  const seconds = Number(document.getElementById("time-modal-seconds").value);
  const newRunTimeInSeconds = minutes * 60 + seconds;
  data.timeOffset += newRunTimeInSeconds - getRunTimeInSeconds();
  saveDataToLocalStorage();
  resetAlerts();
  updateTime();
  hideTimeModal();
  clearAllNotifications();
}

function hideTimeModal() {
  document.getElementById("time-modal").style.display = "none";
}
function showTimeModal() {
  document.getElementById("time-modal").style.display = "block";
  document.getElementById("time-modal-seconds").focus();
}

function disableContextMenuForGraphics() {
  const elementIds = ["time-start-pause"];
  for (const elementId of elementIds) {
    document
      .getElementById(elementId)
      .addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
  }
}

function addEventListenersForMenu() {
  document
    .getElementById("kebab-menu-icon")
    .addEventListener("click", showMenu);
  document.getElementById("menu-close").addEventListener("click", hideMenu);

  document
    .getElementById("btn-notifications")
    .addEventListener("click", onClickBtnNotifications);
}

function showMenu() {
  updateNotificationButtonInMenu();
  document.getElementById("menu").style.display = "block";
}

function hideMenu() {
  document.getElementById("menu").style.display = "none";
}

function updateNotificationButtonInMenu() {
  const btnNotifications = document.getElementById("btn-notifications");
  if ("Notification" in window && navigator.serviceWorker) {
    if (Notification.permission == "granted") {
      btnNotifications.innerText = "Notifications enabled";
      btnNotifications.disabled = true;
    } else {
      btnNotifications.innerText = "Enable Notifications";
      btnNotifications.disabled = false;
    }
  } else {
    btnNotifications.innerText = "Notifications not possible";
    btnNotifications.disabled = true;
  }
}

function onClickBtnNotifications() {
  Notification.requestPermission(function (status) {
    document.getElementById("debug-text").innerText = status;
  });
}

function clearAllNotifications() {
  Notification.get().then((notifications) => {
    for (const notification of notifications) {
      notification.close();
    }
  });
}

function addEventListenersForInfoPage() {
  document.getElementById("info-icon").addEventListener("click", showInfoPage);
  document.getElementById("info-close").addEventListener("click", hideInfoPage);
}

function showInfoPage() {
  updateNotificationButtonInMenu();
  document.getElementById("info").style.display = "block";
}

function hideInfoPage() {
  document.getElementById("info").style.display = "none";
}

async function updateVersionOnInfoPage() {
  try {
    const c = await caches.keys();
    const cacheName = c[0];
    console.log(cacheName.split("_", 2));
    document.getElementById("version").innerText = cacheName.split("_", 2)[1];
  } catch (err) {
    console.error(
      "Couldn't update the version information on the info page.",
      err?.message
    );
  }
}

// Sounds
audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(frequency, duration, volume, type) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.value = volume;
  oscillator.frequency.value = frequency;
  oscillator.type = type;

  oscillator.start();

  setTimeout(function () {
    oscillator.stop();
  }, duration);

  triggerVisualAlert(duration);
}

function triggerVisualAlert(duration) {
  document.body.classList.add("visual-alert");
  setTimeout(() => {
    document.body.classList.remove("visual-alert");
  }, duration);
}

// Service Worker for PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.log(error);
    });
} else {
  console.log("ServiceWorker not supported");
}
