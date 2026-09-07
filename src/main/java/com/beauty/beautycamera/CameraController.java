package com.beauty.beautycamera;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CameraController {

    @GetMapping({"/", "/camera"})
    public String camera() {
        return "camera";
    }
}