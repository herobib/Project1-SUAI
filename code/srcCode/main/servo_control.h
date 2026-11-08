#pragma once

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t servo_control_init(void);

// portId 0..3 : сервы на PCA9685 (по 4 штуки на порт: каналы portId*4 .. portId*4+3)
// portId 4    : 4 сервы напрямую с ESP (LEDC)
// angles[0..2]: углы первых трёх серв, 0..180 градусов
// compress    : состояние четвёртой серво (true = угол сжатия, false = начальный угол)
void servo_set_possition(int portId, int angles[], bool compress);

#ifdef __cplusplus
}
#endif