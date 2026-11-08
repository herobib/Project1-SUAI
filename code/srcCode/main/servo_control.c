#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "driver/ledc.h"
#include "esp_log.h"
#include "pca9685.h"
#include "servo_control.h"

#define I2C_SDA_GPIO GPIO_NUM_21
#define I2C_SCL_GPIO GPIO_NUM_47
#define I2C_HOST     I2C_NUM_0

#define SERVO_PERIOD_US   20000      // период ШИМ: 50 Гц
#define SERVO_RES_BITS    14         // разрешение LEDC-таймера (должно совпадать с LEDC_TIMER_14_BIT)
#define PCA_STEPS         4096       // PCA9685: 12 бит на период
#define SERVO_COUNT       4          // серв напрямую с ESP
#define SERVOS_PER_PORT   4
#define PCA_PORTS         4          // порты 0..3 на PCA9685, порт 4 - прямые серво

static const int s_servo_pins[SERVO_COUNT] = {41, 40, 39, 38};

static const int s_min_us[SERVOS_PER_PORT] = {1000, 1000, 1000, 1000};
static const int s_max_us[SERVOS_PER_PORT] = {2000, 2000, 2000, 2000};

#define COMPRESS_ANGLE 45     // угол сжатия четвёртой серво
#define RELEASE_ANGLE  10     // начальный угол (чуть отступаем от крайнего положения)

static const char *TAG = "servo_control";
static pca9685_handle_t s_pca_handle;
static bool s_pca_ok = false;     // удалось ли инициализировать PCA9685
static uint16_t s_pwms[PCA9685_NB_CHANNELS];


static int angle_to_us(int k, int angle)
{
    if (angle < 0)   angle = 0;
    if (angle > 180) angle = 180;
    return s_min_us[k] + (int)(angle / 180.0f * (s_max_us[k] - s_min_us[k]));
}

static uint16_t us_to_pca(int us)
{
    return (uint16_t)(((uint32_t)us * PCA_STEPS) / SERVO_PERIOD_US);
}

static void servo_write_us(int idx, int us)
{
    if (idx < 0 || idx >= SERVO_COUNT) return;
    uint32_t duty = ((uint32_t)us * (1u << SERVO_RES_BITS)) / SERVO_PERIOD_US;
    ledc_set_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)(4 + idx), duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)(4 + idx));
}

esp_err_t servo_control_init(void)
{
    i2c_master_bus_config_t bus_config = {
        .i2c_port = I2C_HOST,
        .sda_io_num = I2C_SDA_GPIO,
        .scl_io_num = I2C_SCL_GPIO,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags = {
            .enable_internal_pullup = true,
        },
    };
    i2c_master_bus_handle_t i2c_bus_handle = NULL;
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_config, &i2c_bus_handle));
   
    esp_err_t ret = pca9685_create(i2c_bus_handle, PCA9685_DEFAULT_INFO(), &s_pca_handle);
    if (ret == ESP_OK) {
        ret = pca9685_config(s_pca_handle, PCA9685_DEFAULT_CONFIG());
    }

    // Все каналы в нейтраль (1,5 мс)
    for (int i = 0; i < PCA9685_NB_CHANNELS; i++) {
        s_pwms[i] = us_to_pca(1500);
    }
    if (ret == ESP_OK) {
        ret = pca9685_set_pwms(s_pca_handle, s_pwms);
    }

    s_pca_ok = (ret == ESP_OK);
    if (!s_pca_ok) {
        ESP_LOGE(TAG, "PCA9685 init failed: %s (проверьте провода, питание, адрес)", esp_err_to_name(ret));
    }

    ledc_timer_config_t t = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_14_BIT,
        .timer_num       = LEDC_TIMER_1,
        .freq_hz         = 50,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&t));

    for (int i = 0; i < SERVO_COUNT; i++) {
        ledc_channel_config_t c = {
            .gpio_num   = s_servo_pins[i],
            .speed_mode = LEDC_LOW_SPEED_MODE,
            .channel    = (ledc_channel_t)(4 + i),
            .timer_sel  = LEDC_TIMER_1,
            .duty       = 0,          // 0 = импульсов нет, серво не дёргается при старте
            .hpoint     = 0,
        };
        ESP_ERROR_CHECK(ledc_channel_config(&c));
    }
    ESP_LOGI(TAG, "Servo initialized");
    return ESP_OK;
}

void servo_set_possition(int portId, int angles[], bool compress)
{
    if (portId < 0 || portId > PCA_PORTS) {
        ESP_LOGE(TAG, "Invalid portId: %d", portId);
        return;
    }
    if (angles == NULL) {
        ESP_LOGE(TAG, "angles is NULL");
        return;
    }

    const int a[SERVOS_PER_PORT] = {
        angles[0], angles[1], angles[2],
        compress ? COMPRESS_ANGLE : RELEASE_ANGLE,
    };

    if (portId == PCA_PORTS) {
        // порт 4: четыре серво напрямую с ESP
        for (int k = 0; k < SERVOS_PER_PORT; k++) {
            servo_write_us(k, angle_to_us(k, a[k]));
        }
    } else {
        if (!s_pca_ok) {
            ESP_LOGW(TAG, "PCA9685 недоступна, порт %d пропущен", portId);
            return;
        }
        // порты 0..3: меняем только свои 4 канала, остальные остаются как были
        for (int k = 0; k < SERVOS_PER_PORT; k++) {
            s_pwms[portId * SERVOS_PER_PORT + k] = us_to_pca(angle_to_us(k, a[k]));
        }
        esp_err_t ret = pca9685_set_pwms(s_pca_handle, s_pwms);
        if (ret != ESP_OK) {
            ESP_LOGW(TAG, "PCA9685 write failed: %s", esp_err_to_name(ret));
        }
    }
    ESP_LOGI("servo","set complete");
}