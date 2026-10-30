// ==============================================================================
// Copyright (c) 2026 herobib. All rights reserved.
//
// This file is part of the Modular Track Platform (MTP) project.
// Original repository: https://github.com/herobib/Project1-SUAI
// ==============================================================================

#include <math.h>
#include <stdlib.h>
#include <string.h>
#include "driver/ledc.h"
#include "cJSON.h"
#include "esp_log.h"
#include "app_control.h"

static const char *TAG = "app_control";

static const int s_pins[4] = {15, 16, 17, 18};   // A1, A2, B1, B2
static int s_module_state[5];

esp_err_t app_control_init(void)
{
    ledc_timer_config_t t = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_8_BIT,
        .timer_num       = LEDC_TIMER_0,
        .freq_hz         = 1000,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&t));
    for (int i = 0; i < 4; i++) {
        ledc_channel_config_t c = {
            .gpio_num   = s_pins[i],
            .speed_mode = LEDC_LOW_SPEED_MODE,
            .channel    = (ledc_channel_t)i,
            .timer_sel  = LEDC_TIMER_0,
            .duty       = 0,
            .hpoint     = 0,
        };
        ESP_ERROR_CHECK(ledc_channel_config(&c));
    }
    return ESP_OK;
}

static void set_pwm(int ch, int duty)
{
    if (duty < 0)   duty = 0;
    if (duty > 255) duty = 255;
    ledc_set_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)ch, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)ch);
}

static void move(float x, float y)
{
    int base = (int)(255.0f * sqrtf(x * x + y * y));
    int a = base, b = base;

    if (y != 0) {
        if (x > 0)      a = (int)(a * (1 - x));
        else if (x < 0) b = (int)(b * (1 + x));
    }

    if (y > 0) {
        set_pwm(0, a); set_pwm(1, 0); set_pwm(2, b); set_pwm(3, 0);
    } else if (y < 0) {
        set_pwm(0, 0); set_pwm(1, a); set_pwm(2, 0); set_pwm(3, b);
    } else {
        for (int i = 0; i < 4; i++) set_pwm(i, 255);   // торможение, как в оригинале
    }
}

void app_control_stop(void)
{
    move(0, 0);
}

void app_control_handle_text(const char *data, size_t len)
{
    cJSON *root = cJSON_ParseWithLength(data, len);
    if (!root) {
        ESP_LOGW(TAG, "bad JSON");
        return;
    }

    const cJSON *action = cJSON_GetObjectItem(root, "action");
    if (cJSON_IsString(action) && action->valuestring) {
        const char *act = action->valuestring;
        if (strcmp(act, "joistik") == 0) {
            const cJSON *jx = cJSON_GetObjectItem(root, "x");
            const cJSON *jy = cJSON_GetObjectItem(root, "y");
            ESP_LOGI(TAG, "joy x=%.2f y=%.2f",
         cJSON_IsNumber(jx) ? jx->valuedouble : 0.0,
         cJSON_IsNumber(jy) ? jy->valuedouble : 0.0);
            move(cJSON_IsNumber(jx) ? (float)jx->valuedouble : 0.0f,
                 cJSON_IsNumber(jy) ? (float)jy->valuedouble : 0.0f);
        } else if (strncmp(act, "drop", 4) == 0 && act[4] >= '1' && act[4] <= '5' && act[5] == '\0') {
            const cJSON *v = cJSON_GetObjectItem(root, "value");   // React шлёт строку "0".."3"
            int val = cJSON_IsString(v) ? atoi(v->valuestring)
                    : cJSON_IsNumber(v) ? v->valueint : 0;
            s_module_state[act[4] - '1'] = val;
            ESP_LOGI(TAG, "module %c = %d", act[4], val);
        }
    }
    cJSON_Delete(root);
}