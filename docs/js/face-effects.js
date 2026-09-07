/*
 * Face Effects
 * MediaPipe Face Landmarker
 */

let faceLandmarker = null;
let faceLandmarkerReady = false;
let faceLandmarkerLoading = false;


/*
 * Зареждане на MediaPipe Face Landmarker
 */
async function initFaceLandmarker() {

    if (faceLandmarkerReady) {
        return true;
    }

    if (faceLandmarkerLoading) {
        return false;
    }

    faceLandmarkerLoading = true;

    try {

        console.log("Изчакване на MediaPipe...");

        /*
         * Изчакваме vision_bundle.js да зареди
         * FilesetResolver и FaceLandmarker.
         */
        let attempts = 0;

        while (
            (
                typeof FilesetResolver === "undefined" ||
                typeof FaceLandmarker === "undefined"
            ) &&
            attempts < 100
        ) {

            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );

            attempts++;
        }


        /*
         * Проверка дали MediaPipe е зареден
         */
        if (
            typeof FilesetResolver === "undefined" ||
            typeof FaceLandmarker === "undefined"
        ) {

            throw new Error(
                "MediaPipe Tasks Vision не можа да бъде зареден."
            );
        }


        console.log(
            "MediaPipe библиотеката е заредена."
        );


        /*
         * Зареждаме WASM файловете
         */
        const vision =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm"
            );


        console.log(
            "MediaPipe WASM е зареден."
        );


        /*
         * Създаваме Face Landmarker
         */
        faceLandmarker =
            await FaceLandmarker.createFromOptions(
                vision,
                {

                    baseOptions: {

                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

                    },

                    runningMode: "VIDEO",

                    numFaces: 1,

                    minFaceDetectionConfidence: 0.5,

                    minFacePresenceConfidence: 0.5,

                    minTrackingConfidence: 0.5,

                    outputFaceBlendshapes: true

                }
            );


        /*
         * MediaPipe е готов
         */
        faceLandmarkerReady = true;

        console.log(
            "Face Landmarker е готов."
        );

        return true;


    } catch (error) {

        console.error(
            "Грешка при зареждане на MediaPipe:",
            error
        );

        faceLandmarkerReady = false;

        return false;


    } finally {

        faceLandmarkerLoading = false;

    }
}


/*
 * Откриване на лице
 */
function detectFace(video) {

    if (
        !faceLandmarkerReady ||
        !faceLandmarker ||
        !video ||
        !video.videoWidth
    ) {

        return null;

    }


    try {

        const timestamp =
            performance.now();


        const result =
            faceLandmarker.detectForVideo(
                video,
                timestamp
            );


        if (
            !result ||
            !result.faceLandmarks ||
            result.faceLandmarks.length === 0
        ) {

            return null;

        }


        return result;


    } catch (error) {

        console.warn(
            "Face detection error:",
            error
        );

        return null;

    }

}


/*
 * Взима първото намерено лице
 */
function getFaceLandmarks(result) {

    if (
        !result ||
        !result.faceLandmarks ||
        result.faceLandmarks.length === 0
    ) {

        return null;

    }

    return result.faceLandmarks[0];

}


/*
 * Преобразува landmark координати
 * от 0–1 към пиксели
 */
function landmarkToPixel(
    landmark,
    width,
    height
) {

    return {

        x: landmark.x * width,

        y: landmark.y * height,

        z: landmark.z

    };

}


/*
 * Център на лицето
 */
function getFaceCenter(
    landmarks,
    width,
    height
) {

    if (
        !landmarks ||
        landmarks.length === 0
    ) {

        return null;

    }


    let x = 0;
    let y = 0;


    landmarks.forEach(point => {

        x += point.x;

        y += point.y;

    });


    return {

        x:
            (x / landmarks.length) *
            width,

        y:
            (y / landmarks.length) *
            height

    };

}


/*
 * Граници на лицето
 */
function getFaceBounds(
    landmarks,
    width,
    height
) {

    if (
        !landmarks ||
        landmarks.length === 0
    ) {

        return null;

    }


    let minX = 1;
    let minY = 1;

    let maxX = 0;
    let maxY = 0;


    landmarks.forEach(point => {

        minX =
            Math.min(
                minX,
                point.x
            );

        minY =
            Math.min(
                minY,
                point.y
            );

        maxX =
            Math.max(
                maxX,
                point.x
            );

        maxY =
            Math.max(
                maxY,
                point.y
            );

    });


    return {

        left:
            minX * width,

        top:
            minY * height,

        right:
            maxX * width,

        bottom:
            maxY * height,

        width:
            (maxX - minX) * width,

        height:
            (maxY - minY) * height

    };

}


/*
 * Важни точки на лицето
 */
const FACE_POINTS = {

    noseTip: 1,

    noseCenter: 168,

    leftEye: 33,

    rightEye: 263,

    leftEyeInner: 133,

    rightEyeInner: 362,

    leftEyeTop: 159,

    rightEyeTop: 386,

    leftEyeBottom: 145,

    rightEyeBottom: 374,

    upperLip: 13,

    lowerLip: 14,

    leftLip: 61,

    rightLip: 291,

    chin: 152,

    forehead: 10,

    leftCheek: 234,

    rightCheek: 454,

    leftFaceSide: 127,

    rightFaceSide: 356

};


/*
 * Взима конкретна точка от лицето
 */
function getFacePoint(
    landmarks,
    name,
    width,
    height
) {

    const index =
        FACE_POINTS[name];


    if (
        index === undefined ||
        !landmarks ||
        !landmarks[index]
    ) {

        return null;

    }


    return landmarkToPixel(
        landmarks[index],
        width,
        height
    );

}


/*
 * Информация за носа
 */
function getNoseInfo(
    landmarks,
    width,
    height
) {

    const tip =
        getFacePoint(
            landmarks,
            "noseTip",
            width,
            height
        );


    const center =
        getFacePoint(
            landmarks,
            "noseCenter",
            width,
            height
        );


    if (!tip || !center) {

        return null;

    }


    return {

        tip,

        center

    };

}


/*
 * Информация за устните
 */
function getLipsInfo(
    landmarks,
    width,
    height
) {

    const upper =
        getFacePoint(
            landmarks,
            "upperLip",
            width,
            height
        );


    const lower =
        getFacePoint(
            landmarks,
            "lowerLip",
            width,
            height
        );


    const left =
        getFacePoint(
            landmarks,
            "leftLip",
            width,
            height
        );


    const right =
        getFacePoint(
            landmarks,
            "rightLip",
            width,
            height
        );


    if (
        !upper ||
        !lower ||
        !left ||
        !right
    ) {

        return null;

    }


    return {

        upper,

        lower,

        left,

        right

    };

}


/*
 * Информация за очите
 */
function getEyesInfo(
    landmarks,
    width,
    height
) {

    const left =
        getFacePoint(
            landmarks,
            "leftEye",
            width,
            height
        );


    const right =
        getFacePoint(
            landmarks,
            "rightEye",
            width,
            height
        );


    const leftTop =
        getFacePoint(
            landmarks,
            "leftEyeTop",
            width,
            height
        );


    const rightTop =
        getFacePoint(
            landmarks,
            "rightEyeTop",
            width,
            height
        );


    const leftBottom =
        getFacePoint(
            landmarks,
            "leftEyeBottom",
            width,
            height
        );


    const rightBottom =
        getFacePoint(
            landmarks,
            "rightEyeBottom",
            width,
            height
        );


    if (!left || !right) {

        return null;

    }


    return {

        left,

        right,

        leftTop,

        rightTop,

        leftBottom,

        rightBottom

    };

}


/*
 * Пълен анализ на лицето
 */
function analyzeFace(
    landmarks,
    width,
    height
) {

    if (!landmarks) {

        return null;

    }


    return {

        center:
            getFaceCenter(
                landmarks,
                width,
                height
            ),

        bounds:
            getFaceBounds(
                landmarks,
                width,
                height
            ),

        nose:
            getNoseInfo(
                landmarks,
                width,
                height
            ),

        lips:
            getLipsInfo(
                landmarks,
                width,
                height
            ),

        eyes:
            getEyesInfo(
                landmarks,
                width,
                height
            )

    };

}


/*
 * Debug режим –
 * рисува точките на лицето
 */
function drawFaceDebug(
    ctx,
    landmarks,
    width,
    height
) {

    if (!landmarks) {

        return;

    }


    ctx.save();


    ctx.fillStyle =
        "rgba(255,255,255,0.8)";


    for (const point of landmarks) {

        const x =
            point.x * width;

        const y =
            point.y * height;


        ctx.beginPath();


        ctx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );


        ctx.fill();

    }


    ctx.restore();

}


/*
 * Стартираме MediaPipe
 */
initFaceLandmarker();
