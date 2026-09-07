const video =
    document.getElementById("camera");

const liveCanvas =
    document.getElementById("liveCanvas");

const liveCtx =
    liveCanvas.getContext("2d");

const canvas =
    document.getElementById("canvas");

const preview =
    document.getElementById("photoPreview");


const captureBtn =
    document.getElementById("captureBtn");

const flipBtn =
    document.getElementById("flipBtn");

const downloadBtn =
    document.getElementById("downloadBtn");

const retakeBtn =
    document.getElementById("retakeBtn");


const statusEl =
    document.getElementById("status");


/* =========================================================
   SLIDERS
   ========================================================= */

const sliderNames = [

    "beauty",
    "skin",
    "light",

    "faceSlim",
    "jaw",
    "chin",
    "cheeks",
    "forehead",
    "contour",
    "sculpt",

    "nose",
    "noseSide",
    "noseTip",
    "noseLift",
    "noseHeight",

    "eyes",
    "eyeOpen",
    "eyeLift",
    "underEyes",
    "eyeBright",

    "lips",
    "lipWidth",
    "upperLip",
    "lowerLip",
    "lipCorners",

    "skinSmooth",
    "nasolabial",
    "mouthLines",
    "foreheadLines",

    "teeth",
    "blush"
];


const sliders = {};
const valueElements = {};


sliderNames.forEach(name => {

    sliders[name] =
        document.getElementById(name);


    valueElements[name] =
        document.getElementById(
            name + "Value"
        );
});


/* =========================================================
   STATE
   ========================================================= */

let stream = null;

let facingMode = "user";

let animationId = null;

let lastLandmarks = null;

let lastImageData = null;

let faceDetectionBusy = false;

let frameNumber = 0;

let processing = false;


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(text) {

    if (!statusEl) {
        return;
    }

    statusEl.textContent = text;
}


/* =========================================================
   CAMERA
   ========================================================= */

function stopCamera() {

    if (animationId) {

        cancelAnimationFrame(
            animationId
        );

        animationId = null;
    }


    if (stream) {

        stream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        stream = null;
    }
}


/* =========================================================
   START CAMERA
   ========================================================= */

async function startCamera() {

    stopCamera();


    setStatus(
        "Зареждане на камерата..."
    );


    try {

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: facingMode
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    frameRate: {
                        ideal: 30,
                        max: 30
                    }
                },

                audio: false
            });


        video.srcObject =
            stream;


        await video.play();


        /*
         * Изчакваме реалните размери
         * на камерата.
         */

        await waitForVideo();


        liveCanvas.width =
            video.videoWidth;

        liveCanvas.height =
            video.videoHeight;


        setStatus(
            "Камерата е готова"
        );


        startLivePreview();

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        setStatus(
            "Няма достъп до камерата"
        );


        alert(
            "Разреши достъп до камерата."
        );
    }
}


/* =========================================================
   WAIT VIDEO
   ========================================================= */

function waitForVideo() {

    return new Promise(resolve => {

        if (
            video.videoWidth > 0 &&
            video.videoHeight > 0
        ) {

            resolve();

            return;
        }


        const check =
            setInterval(() => {

                if (
                    video.videoWidth > 0 &&
                    video.videoHeight > 0
                ) {

                    clearInterval(
                        check
                    );

                    resolve();
                }

            }, 100);
    });
}


/* =========================================================
   DRAW CAMERA
   ========================================================= */

function drawCamera() {

    const width =
        liveCanvas.width;

    const height =
        liveCanvas.height;


    liveCtx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
     * Предна камера = огледална.
     */

    if (facingMode === "user") {

        liveCtx.save();


        liveCtx.translate(
            width,
            0
        );


        liveCtx.scale(
            -1,
            1
        );


        liveCtx.drawImage(
            video,
            0,
            0,
            width,
            height
        );


        liveCtx.restore();

    } else {

        liveCtx.drawImage(
            video,
            0,
            0,
            width,
            height
        );
    }
}


/* =========================================================
   FACE DETECTION
   ========================================================= */

function detectCurrentFace() {

    if (
        typeof detectFace !== "function" ||
        typeof getFaceLandmarks !== "function"
    ) {
        return null;
    }


    try {

        /*
         * Опитваме с timestamp.
         * Ако твоята функция приема само
         * video, допълнителният параметър
         * просто ще бъде игнориран.
         */

        const timestamp =
            performance.now();


        const result =
            detectFace(
                video,
                timestamp
            );


        if (!result) {
            return null;
        }


        return getFaceLandmarks(
            result
        );

    } catch (error) {

        console.warn(
            "Face detection error:",
            error
        );


        return null;
    }
}


/* =========================================================
   SETTINGS
   ========================================================= */

function getSettings() {

    const settings = {};


    sliderNames.forEach(name => {

        settings[name] =
            Number(
                sliders[name]?.value || 0
            );
    });


    return settings;
}


/* =========================================================
   EFFECT CHECK
   ========================================================= */

function hasFaceEffects(
    settings
) {

    return (

        settings.faceSlim > 0 ||
        settings.jaw > 0 ||
        settings.chin > 0 ||
        settings.cheeks > 0 ||
        settings.forehead > 0 ||
        settings.contour > 0 ||
        settings.sculpt > 0 ||

        settings.nose > 0 ||
        settings.noseSide > 0 ||
        settings.noseTip > 0 ||
        settings.noseLift > 0 ||
        settings.noseHeight > 0 ||

        settings.eyes > 0 ||
        settings.eyeOpen > 0 ||
        settings.eyeLift > 0 ||
        settings.underEyes > 0 ||
        settings.eyeBright > 0 ||

        settings.lips > 0 ||
        settings.lipWidth > 0 ||
        settings.upperLip > 0 ||
        settings.lowerLip > 0 ||
        settings.lipCorners > 0 ||

        settings.skinSmooth > 0 ||
        settings.nasolabial > 0 ||
        settings.mouthLines > 0 ||
        settings.foreheadLines > 0 ||

        settings.teeth > 0 ||
        settings.blush > 0
    );
}


/* =========================================================
   LIGHT
   ========================================================= */

function applyLight(
    ctx,
    width,
    height,
    settings
) {

    const light =
        Number(
            settings.light || 0
        );


    if (light === 0) {
        return;
    }


    ctx.save();


    if (light > 0) {

        ctx.globalCompositeOperation =
            "screen";

        ctx.globalAlpha =
            Math.min(
                light / 220,
                0.25
            );

        ctx.fillStyle =
            "rgb(255,255,255)";

    } else {

        ctx.globalCompositeOperation =
            "multiply";

        ctx.globalAlpha =
            Math.min(
                Math.abs(light) / 250,
                0.20
            );

        ctx.fillStyle =
            "rgb(80,70,60)";
    }


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    ctx.restore();
}


/* =========================================================
   BASIC BEAUTY
   ========================================================= */

function applyBasicBeauty(
    ctx,
    width,
    height,
    settings
) {

    const beauty =
        Number(
            settings.beauty || 0
        ) / 100;


    const skin =
        Number(
            settings.skin || 0
        ) / 100;


    if (
        beauty <= 0 &&
        skin <= 0
    ) {
        return;
    }


    const strength =
        Math.min(
            0.25,
            0.025 +
            beauty * 0.09 +
            skin * 0.13
        );


    const blur =
        Math.min(
            2.2,
            0.45 +
            beauty * 0.65 +
            skin * 1.0
        );


    const smoothCanvas =
        document.createElement(
            "canvas"
        );


    smoothCanvas.width =
        width;

    smoothCanvas.height =
        height;


    const smoothCtx =
        smoothCanvas.getContext(
            "2d"
        );


    smoothCtx.filter =
        `blur(${blur}px)`;


    smoothCtx.drawImage(
        ctx.canvas,
        0,
        0,
        width,
        height
    );


    ctx.save();


    ctx.globalAlpha =
        strength;


    ctx.drawImage(
        smoothCanvas,
        0,
        0,
        width,
        height
    );


    ctx.restore();
}


/* =========================================================
   FACE WARP
   ========================================================= */

function applyFaceEffects(
    sourceCanvas,
    landmarks
) {

    if (
        !landmarks ||
        !window.FaceWarp ||
        typeof window.FaceWarp.applyFaceWarps !==
        "function"
    ) {

        return sourceCanvas;
    }


    const settings =
        getSettings();


    if (
        !hasFaceEffects(settings)
    ) {

        return sourceCanvas;
    }


    try {

        return window.FaceWarp.applyFaceWarps(
            sourceCanvas,
            landmarks,
            settings
        );

    } catch (error) {

        console.error(
            "Face effects error:",
            error
        );


        return sourceCanvas;
    }
}


/* =========================================================
   PROCESS LIVE FRAME
   ========================================================= */

function processLiveFrame() {

    if (processing) {
        return;
    }


    processing = true;


    try {

        const width =
            liveCanvas.width;

        const height =
            liveCanvas.height;


        const source =
            document.createElement(
                "canvas"
            );


        source.width =
            width;

        source.height =
            height;


        const sourceCtx =
            source.getContext(
                "2d"
            );


        sourceCtx.drawImage(
            liveCanvas,
            0,
            0
        );


        /*
         * Лицеви ефекти.
         */

        let processed =
            applyFaceEffects(
                source,
                lastLandmarks
            );


        /*
         * Финален canvas.
         */

        const finalCanvas =
            document.createElement(
                "canvas"
            );


        finalCanvas.width =
            width;

        finalCanvas.height =
            height;


        const finalCtx =
            finalCanvas.getContext(
                "2d"
            );


        finalCtx.drawImage(
            processed,
            0,
            0
        );


        const settings =
            getSettings();


        /*
         * Светлина.
         */

        applyLight(
            finalCtx,
            width,
            height,
            settings
        );


        /*
         * Basic Beauty / кожа.
         */

        applyBasicBeauty(
            finalCtx,
            width,
            height,
            settings
        );


        /*
         * Показваме обработения кадър.
         */

        liveCtx.clearRect(
            0,
            0,
            width,
            height
        );


        liveCtx.drawImage(
            finalCanvas,
            0,
            0
        );

    } catch (error) {

        console.error(
            "Live processing error:",
            error
        );

    } finally {

        processing = false;
    }
}


/* =========================================================
   LIVE PREVIEW
   ========================================================= */

function startLivePreview() {

    if (animationId) {

        cancelAnimationFrame(
            animationId
        );
    }


    frameNumber = 0;


    function render() {

        if (
            !stream ||
            video.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

            animationId =
                requestAnimationFrame(
                    render
                );

            return;
        }


        /*
         * Първо чист кадър от камерата.
         */

        drawCamera();


        frameNumber++;


        /*
         * Face detection приблизително
         * на всеки 5 frames.
         */

        if (
            frameNumber % 5 === 0 &&
            !faceDetectionBusy
        ) {

            faceDetectionBusy =
                true;


            try {

                const detected =
                    detectCurrentFace();


                if (detected) {

                    lastLandmarks =
                        detected;
                }

            } catch (error) {

                console.warn(
                    error
                );

            } finally {

                faceDetectionBusy =
                    false;
            }
        }


        /*
         * Ефектите.
         */

        const settings =
            getSettings();


        if (
            hasFaceEffects(settings)
        ) {

            processLiveFrame();
        }


        animationId =
            requestAnimationFrame(
                render
            );
    }


    render();
}


/* =========================================================
   CATEGORY SYSTEM
   ========================================================= */

const categories =
    document.querySelectorAll(
        ".category"
    );


const effectGroups =
    document.querySelectorAll(
        ".effect-group"
    );


categories.forEach(category => {

    category.addEventListener(
        "click",
        () => {

            const selected =
                category.dataset.category;


            categories.forEach(item => {

                item.classList.remove(
                    "active"
                );
            });


            category.classList.add(
                "active"
            );


            effectGroups.forEach(group => {

                group.classList.toggle(
                    "active",
                    group.dataset.group ===
                    selected
                );
            });
        }
    );
});


/* =========================================================
   SLIDER VALUES
   ========================================================= */

sliderNames.forEach(name => {

    const slider =
        sliders[name];


    const valueElement =
        valueElements[name];


    if (!slider) {
        return;
    }


    if (valueElement) {

        valueElement.textContent =
            slider.value;
    }


    slider.addEventListener(
        "input",
        () => {

            if (valueElement) {

                valueElement.textContent =
                    slider.value;
            }


            setStatus(
                "Live ефект"
            );


            /*
             * При движение на плъзгача
             * следващият frame ще използва
             * новата стойност.
             */
        }
    );
});


/* =========================================================
   CAPTURE
   ========================================================= */

async function capture() {

    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        setStatus(
            "Камерата още не е готова"
        );

        return;
    }


    captureBtn.disabled =
        true;


    setStatus(
        "Запазване..."
    );


    /*
     * Вземаме точно текущия
     * live preview кадър.
     */

    const width =
        liveCanvas.width;

    const height =
        liveCanvas.height;


    canvas.width =
        width;

    canvas.height =
        height;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    ctx.drawImage(
        liveCanvas,
        0,
        0,
        width,
        height
    );


    /*
     * JPEG.
     */

    lastImageData =
        canvas.toDataURL(
            "image/jpeg",
            0.94
        );


    preview.src =
        lastImageData;


    /*
     * Спираме камерата.
     */

    stopCamera();


    /*
     * Показваме снимката.
     */

    video.style.display =
        "none";


    liveCanvas.style.display =
        "none";


    preview.style.display =
        "block";


    captureBtn.classList.add(
        "hidden"
    );


    flipBtn.classList.add(
        "hidden"
    );


    downloadBtn.classList.remove(
        "hidden"
    );


    retakeBtn.classList.remove(
        "hidden"
    );


    captureBtn.disabled =
        false;


    setStatus(
        "Снимката е готова"
    );
}


/* =========================================================
   RETAKE
   ========================================================= */

function retake() {

    preview.style.display =
        "none";


    liveCanvas.style.display =
        "block";


    video.style.display =
        "block";


    captureBtn.classList.remove(
        "hidden"
    );


    flipBtn.classList.remove(
        "hidden"
    );


    downloadBtn.classList.add(
        "hidden"
    );


    retakeBtn.classList.add(
        "hidden"
    );


    lastImageData =
        null;


    lastLandmarks =
        null;


    processing =
        false;


    faceDetectionBusy =
        false;


    startCamera();
}


/* =========================================================
   FLIP CAMERA
   ========================================================= */

flipBtn.addEventListener(
    "click",
    async () => {

        facingMode =
            facingMode === "user"
                ? "environment"
                : "user";


        lastLandmarks =
            null;


        await startCamera();
    }
);


/* =========================================================
   CAPTURE
   ========================================================= */

captureBtn.addEventListener(
    "click",
    capture
);


/* =========================================================
   RETAKE
   ========================================================= */

retakeBtn.addEventListener(
    "click",
    retake
);


/* =========================================================
   DOWNLOAD
   ========================================================= */

downloadBtn.addEventListener(
    "click",
    () => {

        if (!lastImageData) {
            return;
        }


        const link =
            document.createElement(
                "a"
            );


        link.href =
            lastImageData;


        link.download =
            `beauty-photo-${Date.now()}.jpg`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();
    }
);


/* =========================================================
   START
   ========================================================= */

startCamera();