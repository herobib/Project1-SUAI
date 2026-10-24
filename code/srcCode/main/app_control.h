#pragma once
#include <stddef.h>
#include "esp_err.h"

esp_err_t app_control_init(void);
void app_control_handle_text(const char *data, size_t len);
void app_control_stop(void);                                