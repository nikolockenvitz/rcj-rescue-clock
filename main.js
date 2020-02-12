if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
    .then((result) => {
        console.log("ServiceWorker registered");
        console.log(result);
    })
    .catch((error) => {
        console.log("Registration of ServiceWorker failed");
        console.log(error);
    });
} else {
    console.log("ServiceWorker not supported");
}