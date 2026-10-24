// ==============================================================================
// Copyright (c) 2026 herobib. All rights reserved.
//
// This file is part of the Modular Track Platform (MTP) project.
// Original repository: https://github.com/herobib/Project1-SUAI
// ==============================================================================

#pragma once
#include <stddef.h>
#include "esp_err.h"

esp_err_t app_control_init(void);
void app_control_handle_text(const char *data, size_t len);
void app_control_stop(void);                                