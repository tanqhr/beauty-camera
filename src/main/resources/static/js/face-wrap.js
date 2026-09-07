/*
 * FACE WARP
 *
 * Локални деформации на лицето чрез Face Landmarks.
 *
 * НОС:
 * - Стесняване
 * - Странично стесняване
 * - Връх
 * - Повдигане
 * - Височина
 *
 * ЛИЦЕ:
 * - Стесняване
 * - Челюст
 * - Брадичка
 * - Буzi
 * - Чело
 * - Контуриране
 * - Скулптуриране
 *
 * ОЧИ:
 * - Размер
 * - Отваряне
 * - Повдигане
 *
 * УСТНИ:
 * - Размер
 * - Ширина
 * - Горна устна
 * - Долна устна
 * - Ъгли
 *
 * КОЖА:
 * - Назолабиални линии
 * - Линии около устата
 * - Челни линии
 * - Омекотяване
 * - Зона под очите
 *
 * MAKEUP:
 * - Избелване на зъби
 * - Изсветляване на очите
 * - Руж
 */


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function distance(a, b) {

    if (!a || !b) {
        return 0;
    }

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


function smoothFalloff(
    distanceValue,
    radius
) {

    if (radius <= 0) {
        return 0;
    }

    const t =
        clamp(
            distanceValue / radius,
            0,
            1
        );

    return 1 -
        (t * t * (3 - 2 * t));
}


function getLandmarkPixel(
    landmarks,
    index,
    width,
    height
) {

    if (
        !landmarks ||
        !landmarks[index]
    ) {
        return null;
    }

    return {
        x: landmarks[index].x * width,
        y: landmarks[index].y * height
    };
}


function copyCanvas(source) {

    const result =
        document.createElement("canvas");

    result.width =
        source.width;

    result.height =
        source.height;

    const ctx =
        result.getContext("2d");

    ctx.drawImage(
        source,
        0,
        0
    );

    return result;
}


/* =========================================================
   RADIAL WARP
   ========================================================= */

function radialWarp(
    source,
    centerX,
    centerY,
    radius,
    amount
) {

    if (
        !source ||
        radius <= 1 ||
        amount === 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const left =
        Math.max(
            0,
            Math.floor(
                centerX - radius
            )
        );

    const top =
        Math.max(
            0,
            Math.floor(
                centerY - radius
            )
        );

    const right =
        Math.min(
            width,
            Math.ceil(
                centerX + radius
            )
        );

    const bottom =
        Math.min(
            height,
            Math.ceil(
                centerY + radius
            )
        );

    const regionWidth =
        right - left;

    const regionHeight =
        bottom - top;

    if (
        regionWidth <= 1 ||
        regionHeight <= 1
    ) {
        return source;
    }

    const sourceCtx =
        source.getContext("2d");

    const sourceData =
        sourceCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const result =
        copyCanvas(source);

    const resultCtx =
        result.getContext("2d");

    const resultData =
        resultCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const src =
        sourceData.data;

    const dst =
        resultData.data;

    const strength =
        clamp(
            amount,
            -0.75,
            0.75
        );

    for (
        let y = 0;
        y < regionHeight;
        y++
    ) {

        for (
            let x = 0;
            x < regionWidth;
            x++
        ) {

            const globalX =
                left + x;

            const globalY =
                top + y;

            const dx =
                globalX - centerX;

            const dy =
                globalY - centerY;

            const d =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (d >= radius) {
                continue;
            }

            const falloff =
                smoothFalloff(
                    d,
                    radius
                );

            const sourceDistance =
                d *
                (
                    1 +
                    strength *
                    falloff
                );

            let sourceX;
            let sourceY;

            if (d < 0.001) {

                sourceX = centerX;
                sourceY = centerY;

            } else {

                const directionX =
                    dx / d;

                const directionY =
                    dy / d;

                sourceX =
                    centerX +
                    directionX *
                    sourceDistance;

                sourceY =
                    centerY +
                    directionY *
                    sourceDistance;
            }

            const localSourceX =
                clamp(
                    Math.round(
                        sourceX - left
                    ),
                    0,
                    regionWidth - 1
                );

            const localSourceY =
                clamp(
                    Math.round(
                        sourceY - top
                    ),
                    0,
                    regionHeight - 1
                );

            const sourceIndex =
                (
                    localSourceY *
                    regionWidth +
                    localSourceX
                ) * 4;

            const targetIndex =
                (
                    y *
                    regionWidth +
                    x
                ) * 4;

            dst[targetIndex] =
                src[sourceIndex];

            dst[targetIndex + 1] =
                src[sourceIndex + 1];

            dst[targetIndex + 2] =
                src[sourceIndex + 2];

            dst[targetIndex + 3] =
                src[sourceIndex + 3];
        }
    }

    resultCtx.putImageData(
        resultData,
        left,
        top
    );

    return result;
}


/* =========================================================
   DIRECTIONAL WARP
   ========================================================= */

function directionalWarp(
    source,
    centerX,
    centerY,
    radiusX,
    radiusY,
    amount,
    axis
) {

    if (
        !source ||
        amount === 0 ||
        radiusX <= 1 ||
        radiusY <= 1
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const left =
        Math.max(
            0,
            Math.floor(
                centerX - radiusX
            )
        );

    const top =
        Math.max(
            0,
            Math.floor(
                centerY - radiusY
            )
        );

    const right =
        Math.min(
            width,
            Math.ceil(
                centerX + radiusX
            )
        );

    const bottom =
        Math.min(
            height,
            Math.ceil(
                centerY + radiusY
            )
        );

    const regionWidth =
        right - left;

    const regionHeight =
        bottom - top;

    if (
        regionWidth <= 1 ||
        regionHeight <= 1
    ) {
        return source;
    }

    const sourceCtx =
        source.getContext("2d");

    const sourceData =
        sourceCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const result =
        copyCanvas(source);

    const resultCtx =
        result.getContext("2d");

    const resultData =
        resultCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const src =
        sourceData.data;

    const dst =
        resultData.data;

    const strength =
        clamp(
            amount,
            -0.70,
            0.70
        );

    for (
        let y = 0;
        y < regionHeight;
        y++
    ) {

        for (
            let x = 0;
            x < regionWidth;
            x++
        ) {

            const globalX =
                left + x;

            const globalY =
                top + y;

            const normalizedX =
                (
                    globalX -
                    centerX
                ) / radiusX;

            const normalizedY =
                (
                    globalY -
                    centerY
                ) / radiusY;

            const ellipseDistance =
                Math.sqrt(
                    normalizedX *
                    normalizedX +
                    normalizedY *
                    normalizedY
                );

            if (
                ellipseDistance >= 1
            ) {
                continue;
            }

            const falloff =
                smoothFalloff(
                    ellipseDistance,
                    1
                );

            let sourceX =
                globalX;

            let sourceY =
                globalY;

            if (axis === "x") {

                sourceX =
                    centerX +
                    (
                        globalX -
                        centerX
                    ) *
                    (
                        1 +
                        strength *
                        falloff
                    );

            } else {

                sourceY =
                    centerY +
                    (
                        globalY -
                        centerY
                    ) *
                    (
                        1 +
                        strength *
                        falloff
                    );
            }

            const localSourceX =
                clamp(
                    Math.round(
                        sourceX - left
                    ),
                    0,
                    regionWidth - 1
                );

            const localSourceY =
                clamp(
                    Math.round(
                        sourceY - top
                    ),
                    0,
                    regionHeight - 1
                );

            const sourceIndex =
                (
                    localSourceY *
                    regionWidth +
                    localSourceX
                ) * 4;

            const targetIndex =
                (
                    y *
                    regionWidth +
                    x
                ) * 4;

            dst[targetIndex] =
                src[sourceIndex];

            dst[targetIndex + 1] =
                src[sourceIndex + 1];

            dst[targetIndex + 2] =
                src[sourceIndex + 2];

            dst[targetIndex + 3] =
                src[sourceIndex + 3];
        }
    }

    resultCtx.putImageData(
        resultData,
        left,
        top
    );

    return result;
}


/* =========================================================
   FACE INFORMATION
   ========================================================= */

function getFaceInfo(
    landmarks,
    width,
    height
) {

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    if (!face) {
        return null;
    }

    const points = {};

    const names = [
        "noseTip",
        "noseCenter",
        "leftEye",
        "rightEye",
        "leftEyeInner",
        "rightEyeInner",
        "leftEyeTop",
        "rightEyeTop",
        "leftEyeBottom",
        "rightEyeBottom",
        "upperLip",
        "lowerLip",
        "leftLip",
        "rightLip",
        "chin",
        "forehead",
        "leftCheek",
        "rightCheek",
        "leftFaceSide",
        "rightFaceSide"
    ];

    names.forEach(name => {

        points[name] =
            getFacePoint(
                landmarks,
                name,
                width,
                height
            );
    });

    return {
        bounds: face.bounds,
        points
    };
}


/* =========================================================
   NOSE INFORMATION
   ========================================================= */

function getNosePoints(
    landmarks,
    width,
    height
) {

    const noseTip =
        getFacePoint(
            landmarks,
            "noseTip",
            width,
            height
        );

    const noseCenter =
        getFacePoint(
            landmarks,
            "noseCenter",
            width,
            height
        );

    const leftNostril =
        getLandmarkPixel(
            landmarks,
            98,
            width,
            height
        );

    const rightNostril =
        getLandmarkPixel(
            landmarks,
            327,
            width,
            height
        );

    return {
        noseTip,
        noseCenter,
        leftNostril,
        rightNostril
    };
}


function calculateNoseCenter(nose) {

    if (!nose) {
        return null;
    }

    if (
        nose.noseCenter &&
        nose.noseTip
    ) {

        return {

            x:
                nose.noseCenter.x * 0.65 +
                nose.noseTip.x * 0.35,

            y:
                nose.noseCenter.y * 0.65 +
                nose.noseTip.y * 0.35
        };
    }

    return nose.noseTip;
}


/* =========================================================
   NOSE — NARROW
   ========================================================= */

function warpNoseNarrow(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    const center =
        calculateNoseCenter(nose);

    if (!center) {
        return source;
    }

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    let radius =
        Math.min(
            width,
            height
        ) * 0.08;

    if (
        face &&
        face.bounds
    ) {

        radius =
            face.bounds.width *
            0.105;
    }

    radius =
        clamp(
            radius,
            28,
            110
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.48;

    return directionalWarp(
        source,
        center.x,
        center.y,
        radius,
        radius * 1.35,
        strength,
        "x"
    );
}


/* =========================================================
   NOSE — SIDES
   ========================================================= */

function warpNoseSides(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    if (
        !nose.leftNostril ||
        !nose.rightNostril
    ) {

        return warpNoseNarrow(
            source,
            landmarks,
            amount * 0.65
        );
    }

    const centerX =
        (
            nose.leftNostril.x +
            nose.rightNostril.x
        ) / 2;

    const centerY =
        (
            nose.leftNostril.y +
            nose.rightNostril.y
        ) / 2;

    const nostrilWidth =
        distance(
            nose.leftNostril,
            nose.rightNostril
        );

    const radiusX =
        clamp(
            nostrilWidth * 0.90,
            25,
            90
        );

    const radiusY =
        clamp(
            nostrilWidth * 0.75,
            22,
            75
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.55;

    return directionalWarp(
        source,
        centerX,
        centerY,
        radiusX,
        radiusY,
        strength,
        "x"
    );
}


/* =========================================================
   NOSE — TIP
   ========================================================= */

function warpNoseTip(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    if (!nose.noseTip) {
        return source;
    }

    const tip =
        nose.noseTip;

    const radius =
        clamp(
            Math.min(
                width,
                height
            ) * 0.045,
            18,
            60
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.30;

    return radialWarp(
        source,
        tip.x,
        tip.y,
        radius,
        strength
    );
}


/* =========================================================
   NOSE — LIFT
   ========================================================= */

function warpNoseLift(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    if (!nose.noseTip) {
        return source;
    }

    const tip =
        nose.noseTip;

    const radiusX =
        clamp(
            Math.min(
                width,
                height
            ) * 0.055,
            22,
            75
        );

    const radiusY =
        clamp(
            Math.min(
                width,
                height
            ) * 0.075,
            28,
            95
        );

    const liftPixels =
        -(
            Number(amount) /
            100
        ) *
        Math.min(
            width,
            height
        ) *
        0.012;

    const result =
        copyCanvas(source);

    const sourceCtx =
        source.getContext("2d");

    const resultCtx =
        result.getContext("2d");

    const left =
        Math.max(
            0,
            Math.floor(
                tip.x - radiusX
            )
        );

    const top =
        Math.max(
            0,
            Math.floor(
                tip.y - radiusY
            )
        );

    const right =
        Math.min(
            width,
            Math.ceil(
                tip.x + radiusX
            )
        );

    const bottom =
        Math.min(
            height,
            Math.ceil(
                tip.y + radiusY
            )
        );

    const regionWidth =
        right - left;

    const regionHeight =
        bottom - top;

    if (
        regionWidth <= 1 ||
        regionHeight <= 1
    ) {
        return source;
    }

    const sourceData =
        sourceCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const resultData =
        resultCtx.getImageData(
            left,
            top,
            regionWidth,
            regionHeight
        );

    const src =
        sourceData.data;

    const dst =
        resultData.data;

    for (
        let y = 0;
        y < regionHeight;
        y++
    ) {

        for (
            let x = 0;
            x < regionWidth;
            x++
        ) {

            const globalX =
                left + x;

            const globalY =
                top + y;

            const nx =
                (
                    globalX -
                    tip.x
                ) / radiusX;

            const ny =
                (
                    globalY -
                    tip.y
                ) / radiusY;

            const d =
                Math.sqrt(
                    nx * nx +
                    ny * ny
                );

            if (d >= 1) {
                continue;
            }

            const falloff =
                smoothFalloff(
                    d,
                    1
                );

            let sourceY =
                globalY -
                (
                    liftPixels *
                    falloff
                );

            sourceY =
                clamp(
                    Math.round(
                        sourceY - top
                    ),
                    0,
                    regionHeight - 1
                );

            const sourceX =
                clamp(
                    Math.round(
                        globalX - left
                    ),
                    0,
                    regionWidth - 1
                );

            const sourceIndex =
                (
                    sourceY *
                    regionWidth +
                    sourceX
                ) * 4;

            const targetIndex =
                (
                    y *
                    regionWidth +
                    x
                ) * 4;

            dst[targetIndex] =
                src[sourceIndex];

            dst[targetIndex + 1] =
                src[sourceIndex + 1];

            dst[targetIndex + 2] =
                src[sourceIndex + 2];

            dst[targetIndex + 3] =
                src[sourceIndex + 3];
        }
    }

    resultCtx.putImageData(
        resultData,
        left,
        top
    );

    return result;
}


/* =========================================================
   NOSE — HEIGHT
   ========================================================= */

function warpNoseHeight(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    const center =
        calculateNoseCenter(nose);

    if (!center) {
        return source;
    }

    const radiusX =
        clamp(
            Math.min(
                width,
                height
            ) * 0.065,
            25,
            85
        );

    const radiusY =
        clamp(
            Math.min(
                width,
                height
            ) * 0.13,
            45,
            140
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.30;

    return directionalWarp(
        source,
        center.x,
        center.y,
        radiusX,
        radiusY,
        strength,
        "y"
    );
}


/* =========================================================
   NOSE — ALL
   ========================================================= */

function warpNose(
    source,
    landmarks,
    settings
) {

    if (
        !source ||
        !landmarks ||
        !settings
    ) {
        return source;
    }

    let result =
        source;

    result =
        warpNoseNarrow(
            result,
            landmarks,
            Number(
                settings.nose || 0
            )
        );

    result =
        warpNoseSides(
            result,
            landmarks,
            Number(
                settings.noseSide || 0
            )
        );

    result =
        warpNoseTip(
            result,
            landmarks,
            Number(
                settings.noseTip || 0
            )
        );

    result =
        warpNoseLift(
            result,
            landmarks,
            Number(
                settings.noseLift || 0
            )
        );

    result =
        warpNoseHeight(
            result,
            landmarks,
            Number(
                settings.noseHeight || 0
            )
        );

    return result;
}


/* =========================================================
   FACE SLIMMING
   ========================================================= */

function warpFaceSlim(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    if (
        !face ||
        !face.bounds
    ) {
        return source;
    }

    const centerX =
        (
            face.bounds.left +
            face.bounds.right
        ) / 2;

    const centerY =
        (
            face.bounds.top +
            face.bounds.bottom
        ) / 2;

    const radiusX =
        face.bounds.width * 0.58;

    const radiusY =
        face.bounds.height * 0.52;

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.32;

    return directionalWarp(
        source,
        centerX,
        centerY,
        radiusX,
        radiusY,
        strength,
        "x"
    );
}


/* =========================================================
   JAW
   ========================================================= */

function warpJaw(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    if (
        !face ||
        !face.bounds
    ) {
        return source;
    }

    const y =
        face.bounds.top +
        face.bounds.height *
        0.72;

    const centerX =
        (
            face.bounds.left +
            face.bounds.right
        ) / 2;

    const radiusX =
        face.bounds.width * 0.48;

    const radiusY =
        face.bounds.height * 0.28;

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.30;

    return directionalWarp(
        source,
        centerX,
        y,
        radiusX,
        radiusY,
        strength,
        "x"
    );
}


/* =========================================================
   CHIN
   ========================================================= */

function warpChin(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const chin =
        getFacePoint(
            landmarks,
            "chin",
            width,
            height
        );

    if (!chin) {
        return source;
    }

    const radius =
        clamp(
            Math.min(
                width,
                height
            ) * 0.12,
            45,
            130
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.24;

    return radialWarp(
        source,
        chin.x,
        chin.y,
        radius,
        strength
    );
}


/* =========================================================
   CHEEKS
   ========================================================= */

function warpCheeks(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const left =
        getFacePoint(
            landmarks,
            "leftCheek",
            width,
            height
        );

    const right =
        getFacePoint(
            landmarks,
            "rightCheek",
            width,
            height
        );

    const radius =
        clamp(
            width * 0.13,
            45,
            130
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.24;

    let result =
        source;

    if (left) {

        result =
            radialWarp(
                result,
                left.x,
                left.y,
                radius,
                strength
            );
    }

    if (right) {

        result =
            radialWarp(
                result,
                right.x,
                right.y,
                radius,
                strength
            );
    }

    return result;
}


/* =========================================================
   FOREHEAD
   ========================================================= */

function warpForehead(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const forehead =
        getFacePoint(
            landmarks,
            "forehead",
            width,
            height
        );

    if (!forehead) {
        return source;
    }

    const radiusX =
        clamp(
            width * 0.16,
            50,
            160
        );

    const radiusY =
        clamp(
            height * 0.13,
            45,
            130
        );

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.18;

    return directionalWarp(
        source,
        forehead.x,
        forehead.y,
        radiusX,
        radiusY,
        strength,
        "x"
    );
}


/* =========================================================
   CONTOUR
   ========================================================= */

function warpContour(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    let result =
        source;

    result =
        warpFaceSlim(
            result,
            landmarks,
            amount * 0.70
        );

    result =
        warpJaw(
            result,
            landmarks,
            amount * 0.65
        );

    result =
        warpCheeks(
            result,
            landmarks,
            amount * 0.45
        );

    return result;
}


/* =========================================================
   LIPS — BASIC SIZE
   ========================================================= */

function warpLips(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount === 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips) {
        return source;
    }

    const centerX =
        (
            lips.left.x +
            lips.right.x
        ) / 2;

    const centerY =
        (
            lips.upper.y +
            lips.lower.y
        ) / 2;

    const mouthWidth =
        distance(
            lips.left,
            lips.right
        );

    const radius =
        clamp(
            mouthWidth * 0.75,
            30,
            130
        );

    const strength =
        (
            Number(amount) /
            100
        ) * 0.40;

    return radialWarp(
        source,
        centerX,
        centerY,
        radius,
        strength
    );
}


/* =========================================================
   LIPS — WIDTH
   ========================================================= */

function warpLipWidth(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips) {
        return source;
    }

    const centerX =
        (
            lips.left.x +
            lips.right.x
        ) / 2;

    const centerY =
        (
            lips.upper.y +
            lips.lower.y
        ) / 2;

    const mouthWidth =
        distance(
            lips.left,
            lips.right
        );

    return directionalWarp(
        source,
        centerX,
        centerY,
        clamp(
            mouthWidth * 0.80,
            35,
            140
        ),
        clamp(
            mouthWidth * 0.48,
            25,
            85
        ),
        -(
            Number(amount) /
            100
        ) * 0.25,
        "x"
    );
}


/* =========================================================
   UPPER LIP
   ========================================================= */

function warpUpperLip(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips || !lips.upper) {
        return source;
    }

    return directionalWarp(
        source,
        lips.upper.x,
        lips.upper.y,
        55,
        35,
        -(
            Number(amount) /
            100
        ) * 0.30,
        "y"
    );
}


/* =========================================================
   LOWER LIP
   ========================================================= */

function warpLowerLip(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips || !lips.lower) {
        return source;
    }

    return directionalWarp(
        source,
        lips.lower.x,
        lips.lower.y,
        55,
        35,
        (
            Number(amount) /
            100
        ) * 0.28,
        "y"
    );
}


/* =========================================================
   LIP CORNERS
   ========================================================= */

function warpLipCorners(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips) {
        return source;
    }

    const lift =
        (
            Number(amount) /
            100
        ) *
        Math.min(
            width,
            height
        ) *
        0.008;

    let result =
        source;

    if (lips.left) {

        result =
            directionalWarp(
                result,
                lips.left.x,
                lips.left.y,
                35,
                30,
                -lift / 25,
                "y"
            );
    }

    if (lips.right) {

        result =
            directionalWarp(
                result,
                lips.right.x,
                lips.right.y,
                35,
                30,
                -lift / 25,
                "y"
            );
    }

    return result;
}


/* =========================================================
   EYES — SIZE
   ========================================================= */

function warpEyes(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount === 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const eyes =
        getEyesInfo(
            landmarks,
            width,
            height
        );

    if (!eyes) {
        return source;
    }

    const strength =
        (
            Number(amount) /
            100
        ) * 0.32;

    const radius =
        clamp(
            width * 0.055,
            28,
            75
        );

    let result =
        source;

    if (eyes.left) {

        result =
            radialWarp(
                result,
                eyes.left.x,
                eyes.left.y,
                radius,
                strength
            );
    }

    if (eyes.right) {

        result =
            radialWarp(
                result,
                eyes.right.x,
                eyes.right.y,
                radius,
                strength
            );
    }

    return result;
}


/* =========================================================
   EYES — OPEN
   ========================================================= */

function warpEyeOpening(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const eyes =
        getEyesInfo(
            landmarks,
            width,
            height
        );

    if (!eyes) {
        return source;
    }

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.22;

    let result =
        source;

    if (eyes.left) {

        result =
            directionalWarp(
                result,
                eyes.left.x,
                eyes.left.y,
                55,
                40,
                strength,
                "y"
            );
    }

    if (eyes.right) {

        result =
            directionalWarp(
                result,
                eyes.right.x,
                eyes.right.y,
                55,
                40,
                strength,
                "y"
            );
    }

    return result;
}


/* =========================================================
   EYES — LIFT
   ========================================================= */

function warpEyeLift(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const eyes =
        getEyesInfo(
            landmarks,
            width,
            height
        );

    if (!eyes) {
        return source;
    }

    const shift =
        -(
            Number(amount) /
            100
        ) *
        Math.min(
            width,
            height
        ) *
        0.012;

    let result =
        source;

    const points = [
        eyes.left,
        eyes.right
    ];

    points.forEach(point => {

        if (!point) {
            return;
        }

        result =
            directionalWarp(
                result,
                point.x,
                point.y,
                65,
                45,
                shift / 20,
                "y"
            );
    });

    return result;
}


/* =========================================================
   FACE SCULPT
   ========================================================= */

function warpSculpt(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount === 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    if (
        !face ||
        !face.bounds
    ) {
        return source;
    }

    const strength =
        -(
            Number(amount) /
            100
        ) * 0.30;

    const faceWidth =
        face.bounds.width;

    const cheekRadius =
        clamp(
            faceWidth * 0.22,
            45,
            160
        );

    let result =
        source;

    const leftCheek =
        getFacePoint(
            landmarks,
            "leftCheek",
            width,
            height
        );

    const rightCheek =
        getFacePoint(
            landmarks,
            "rightCheek",
            width,
            height
        );

    if (leftCheek) {

        result =
            radialWarp(
                result,
                leftCheek.x,
                leftCheek.y,
                cheekRadius,
                strength
            );
    }

    if (rightCheek) {

        result =
            radialWarp(
                result,
                rightCheek.x,
                rightCheek.y,
                cheekRadius,
                strength
            );
    }

    return result;
}


/* =========================================================
   NASOLABIAL LINES
   ========================================================= */

function softenArea(
    source,
    centerX,
    centerY,
    radius,
    strength
) {

    if (
        !source ||
        radius <= 1 ||
        strength <= 0
    ) {
        return source;
    }

    const result =
        copyCanvas(source);

    const sourceCtx =
        source.getContext("2d");

    const resultCtx =
        result.getContext("2d");

    const left =
        Math.max(
            0,
            Math.floor(
                centerX - radius
            )
        );

    const top =
        Math.max(
            0,
            Math.floor(
                centerY - radius
            )
        );

    const right =
        Math.min(
            source.width,
            Math.ceil(
                centerX + radius
            )
        );

    const bottom =
        Math.min(
            source.height,
            Math.ceil(
                centerY + radius
            )
        );

    const w =
        right - left;

    const h =
        bottom - top;

    if (w <= 1 || h <= 1) {
        return source;
    }

    const original =
        sourceCtx.getImageData(
            left,
            top,
            w,
            h
        );

    const blurred =
        copyCanvas(source);

    const blurCtx =
        blurred.getContext("2d");

    blurCtx.filter =
        `blur(${1.5 + strength * 2.5}px)`;

    blurCtx.drawImage(
        source,
        0,
        0
    );

    const blurData =
        blurCtx.getImageData(
            left,
            top,
            w,
            h
        );

    const resultData =
        resultCtx.getImageData(
            left,
            top,
            w,
            h
        );

    const src =
        original.data;

    const blur =
        blurData.data;

    const dst =
        resultData.data;

    for (
        let y = 0;
        y < h;
        y++
    ) {

        for (
            let x = 0;
            x < w;
            x++
        ) {

            const px =
                left + x;

            const py =
                top + y;

            const d =
                Math.sqrt(
                    Math.pow(
                        px - centerX,
                        2
                    ) +
                    Math.pow(
                        py - centerY,
                        2
                    )
                );

            if (d >= radius) {
                continue;
            }

            const falloff =
                smoothFalloff(
                    d,
                    radius
                );

            const mix =
                clamp(
                    strength *
                    falloff,
                    0,
                    0.65
                );

            const index =
                (
                    y * w +
                    x
                ) * 4;

            dst[index] =
                src[index] *
                (1 - mix) +
                blur[index] *
                mix;

            dst[index + 1] =
                src[index + 1] *
                (1 - mix) +
                blur[index + 1] *
                mix;

            dst[index + 2] =
                src[index + 2] *
                (1 - mix) +
                blur[index + 2] *
                mix;

            dst[index + 3] =
                src[index + 3];
        }
    }

    resultCtx.putImageData(
        resultData,
        left,
        top
    );

    return result;
}


function warpNasolabial(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    const nose =
        getNosePoints(
            landmarks,
            width,
            height
        );

    if (
        !lips ||
        !nose.noseTip
    ) {
        return source;
    }

    const strength =
        Number(amount) /
        100;

    let result =
        source;

    const leftX =
        (
            nose.noseTip.x +
            lips.left.x
        ) / 2;

    const leftY =
        (
            nose.noseTip.y +
            lips.left.y
        ) / 2;

    const rightX =
        (
            nose.noseTip.x +
            lips.right.x
        ) / 2;

    const rightY =
        (
            nose.noseTip.y +
            lips.right.y
        ) / 2;

    const radius =
        clamp(
            distance(
                nose.noseTip,
                lips.left
            ) * 0.42,
            18,
            55
        );

    result =
        softenArea(
            result,
            leftX,
            leftY,
            radius,
            strength
        );

    result =
        softenArea(
            result,
            rightX,
            rightY,
            radius,
            strength
        );

    return result;
}


/* =========================================================
   MOUTH LINES
   ========================================================= */

function warpMouthLines(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips) {
        return source;
    }

    const strength =
        Number(amount) /
        100;

    let result =
        source;

    const radius =
        clamp(
            distance(
                lips.left,
                lips.right
            ) * 0.30,
            20,
            55
        );

    result =
        softenArea(
            result,
            lips.left.x,
            lips.left.y,
            radius,
            strength
        );

    result =
        softenArea(
            result,
            lips.right.x,
            lips.right.y,
            radius,
            strength
        );

    return result;
}


/* =========================================================
   FOREHEAD LINES
   ========================================================= */

function softenForeheadLines(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const forehead =
        getFacePoint(
            landmarks,
            "forehead",
            width,
            height
        );

    if (!forehead) {
        return source;
    }

    return softenArea(
        source,
        forehead.x,
        forehead.y,
        clamp(
            width * 0.18,
            60,
            180
        ),
        Number(amount) / 100
    );
}


/* =========================================================
   UNDER EYE
   ========================================================= */

function softenUnderEyes(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const eyes =
        getEyesInfo(
            landmarks,
            width,
            height
        );

    if (!eyes) {
        return source;
    }

    let result =
        source;

    const strength =
        Number(amount) /
        100;

    const radius =
        clamp(
            width * 0.065,
            28,
            75
        );

    if (eyes.left) {

        result =
            softenArea(
                result,
                eyes.left.x,
                eyes.left.y + radius * 0.55,
                radius,
                strength
            );
    }

    if (eyes.right) {

        result =
            softenArea(
                result,
                eyes.right.x,
                eyes.right.y + radius * 0.55,
                radius,
                strength
            );
    }

    return result;
}


/* =========================================================
   GENERAL SKIN SOFTEN
   ========================================================= */

function softenSkin(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const face =
        analyzeFace(
            landmarks,
            width,
            height
        );

    if (
        !face ||
        !face.bounds
    ) {
        return source;
    }

    const centerX =
        (
            face.bounds.left +
            face.bounds.right
        ) / 2;

    const centerY =
        (
            face.bounds.top +
            face.bounds.bottom
        ) / 2;

    return softenArea(
        source,
        centerX,
        centerY,
        Math.max(
            face.bounds.width,
            face.bounds.height
        ) * 0.55,
        (
            Number(amount) /
            100
        ) * 0.55
    );
}


/* =========================================================
   EYE BRIGHTEN
   ========================================================= */

function brightenEyes(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const eyes =
        getEyesInfo(
            landmarks,
            width,
            height
        );

    if (!eyes) {
        return source;
    }

    const result =
        copyCanvas(source);

    const ctx =
        result.getContext("2d");

    const strength =
        (
            Number(amount) /
            100
        ) * 0.20;

    const radius =
        clamp(
            width * 0.035,
            14,
            45
        );

    ctx.save();

    ctx.globalCompositeOperation =
        "screen";

    ctx.globalAlpha =
        strength;

    ctx.fillStyle =
        "white";

    [
        eyes.left,
        eyes.right
    ].forEach(point => {

        if (!point) {
            return;
        }

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.restore();

    return result;
}


/* =========================================================
   TEETH WHITENING
   ========================================================= */

function whitenTeeth(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const lips =
        getLipsInfo(
            landmarks,
            width,
            height
        );

    if (!lips) {
        return source;
    }

    const result =
        copyCanvas(source);

    const ctx =
        result.getContext("2d");

    const centerX =
        (
            lips.left.x +
            lips.right.x
        ) / 2;

    const centerY =
        (
            lips.upper.y +
            lips.lower.y
        ) / 2;

    const radiusX =
        clamp(
            distance(
                lips.left,
                lips.right
            ) * 0.42,
            30,
            100
        );

    const radiusY =
        clamp(
            radiusX * 0.32,
            15,
            45
        );

    ctx.save();

    ctx.globalCompositeOperation =
        "screen";

    ctx.globalAlpha =
        (
            Number(amount) /
            100
        ) * 0.16;

    ctx.fillStyle =
        "rgb(255,250,235)";

    ctx.beginPath();

    ctx.ellipse(
        centerX,
        centerY,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    return result;
}


/* =========================================================
   BLUSH
   ========================================================= */

function applyBlush(
    source,
    landmarks,
    amount
) {

    if (
        !landmarks ||
        amount <= 0
    ) {
        return source;
    }

    const width =
        source.width;

    const height =
        source.height;

    const left =
        getFacePoint(
            landmarks,
            "leftCheek",
            width,
            height
        );

    const right =
        getFacePoint(
            landmarks,
            "rightCheek",
            width,
            height
        );

    if (!left && !right) {
        return source;
    }

    const result =
        copyCanvas(source);

    const ctx =
        result.getContext("2d");

    ctx.save();

    ctx.globalCompositeOperation =
        "soft-light";

    ctx.globalAlpha =
        (
            Number(amount) /
            100
        ) * 0.18;

    ctx.fillStyle =
        "rgb(220,80,100)";

    const radius =
        clamp(
            width * 0.075,
            25,
            75
        );

    [left, right].forEach(point => {

        if (!point) {
            return;
        }

        const gradient =
            ctx.createRadialGradient(
                point.x,
                point.y,
                0,
                point.x,
                point.y,
                radius
            );

        gradient.addColorStop(
            0,
            "rgba(220,80,100,0.8)"
        );

        gradient.addColorStop(
            1,
            "rgba(220,80,100,0)"
        );

        ctx.fillStyle =
            gradient;

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.restore();

    return result;
}


/* =========================================================
   APPLY ALL FACE WARPS
   ========================================================= */

function applyFaceWarps(
    source,
    landmarks,
    settings
) {

    if (
        !source ||
        !landmarks ||
        !settings
    ) {
        return source;
    }

    let result =
        source;


    /* =========================
       НОС
       ========================= */

    result =
        warpNose(
            result,
            landmarks,
            settings
        );


    /* =========================
       ЛИЦЕ
       ========================= */

    result =
        warpFaceSlim(
            result,
            landmarks,
            Number(
                settings.faceSlim || 0
            )
        );

    result =
        warpJaw(
            result,
            landmarks,
            Number(
                settings.jaw || 0
            )
        );

    result =
        warpChin(
            result,
            landmarks,
            Number(
                settings.chin || 0
            )
        );

    result =
        warpCheeks(
            result,
            landmarks,
            Number(
                settings.cheeks || 0
            )
        );

    result =
        warpForehead(
            result,
            landmarks,
            Number(
                settings.forehead || 0
            )
        );

    result =
        warpContour(
            result,
            landmarks,
            Number(
                settings.contour || 0
            )
        );

    result =
        warpSculpt(
            result,
            landmarks,
            Number(
                settings.sculpt || 0
            )
        );


    /* =========================
       ОЧИ
       ========================= */

    result =
        warpEyes(
            result,
            landmarks,
            Number(
                settings.eyes || 0
            )
        );

    result =
        warpEyeOpening(
            result,
            landmarks,
            Number(
                settings.eyeOpen || 0
            )
        );

    result =
        warpEyeLift(
            result,
            landmarks,
            Number(
                settings.eyeLift || 0
            )
        );


    /* =========================
       УСТНИ
       ========================= */

    result =
        warpLips(
            result,
            landmarks,
            Number(
                settings.lips || 0
            )
        );

    result =
        warpLipWidth(
            result,
            landmarks,
            Number(
                settings.lipWidth || 0
            )
        );

    result =
        warpUpperLip(
            result,
            landmarks,
            Number(
                settings.upperLip || 0
            )
        );

    result =
        warpLowerLip(
            result,
            landmarks,
            Number(
                settings.lowerLip || 0
            )
        );

    result =
        warpLipCorners(
            result,
            landmarks,
            Number(
                settings.lipCorners || 0
            )
        );


    /* =========================
       КОЖА
       ========================= */

    result =
        softenSkin(
            result,
            landmarks,
            Number(
                settings.skinSmooth || 0
            )
        );

    result =
        softenUnderEyes(
            result,
            landmarks,
            Number(
                settings.underEyes || 0
            )
        );

    result =
        warpNasolabial(
            result,
            landmarks,
            Number(
                settings.nasolabial || 0
            )
        );

    result =
        warpMouthLines(
            result,
            landmarks,
            Number(
                settings.mouthLines || 0
            )
        );

    result =
        softenForeheadLines(
            result,
            landmarks,
            Number(
                settings.foreheadLines || 0
            )
        );


    /* =========================
       MAKEUP
       ========================= */

    result =
        brightenEyes(
            result,
            landmarks,
            Number(
                settings.eyeBright || 0
            )
        );

    result =
        whitenTeeth(
            result,
            landmarks,
            Number(
                settings.teeth || 0
            )
        );

    result =
        applyBlush(
            result,
            landmarks,
            Number(
                settings.blush || 0
            )
        );


    return result;
}


/* =========================================================
   EXPORT
   ========================================================= */

window.FaceWarp = {

    applyFaceWarps,

    warpNose,

    warpNoseNarrow,

    warpNoseSides,

    warpNoseTip,

    warpNoseLift,

    warpNoseHeight,

    warpFaceSlim,

    warpJaw,

    warpChin,

    warpCheeks,

    warpForehead,

    warpContour,

    warpLips,

    warpLipWidth,

    warpUpperLip,

    warpLowerLip,

    warpLipCorners,

    warpEyes,

    warpEyeOpening,

    warpEyeLift,

    warpSculpt,

    warpNasolabial,

    warpMouthLines,

    softenForeheadLines,

    softenUnderEyes,

    softenSkin,

    brightenEyes,

    whitenTeeth,

    applyBlush
};