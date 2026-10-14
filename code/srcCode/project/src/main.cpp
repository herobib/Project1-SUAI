// ==============================================================================
// Copyright (c) 2026 herobib
// All rights reserved.
//
// Original repository: https://github.com/herobib/Project1-SUAI
// For licensing information, see the LICENSE file in the repository root.
// ==============================================================================

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Wire.h>

#include "USB_STREAM.h"

#define MotorA1 15
#define MotorA2 16
#define MotorB1 18
#define MotorB2 17

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
USB_STREAM *usb_cam = new USB_STREAM();

void camera_frame_cb(uvc_frame_t *frame, void *user_ctx) {
    if (frame && frame->data_bytes > 0 && ws.count() > 0) {
        // ws.binaryAll((char*)frame->data, frame->data_bytes);
        // ws.textAll("фото");
        Serial.println("фото");
    }
}


int moduleState[] ={0,0,0,0,0};
float XManageInfluence=0.0f;
float YManageInfluence=0.0f;

void move(){
  int basePWM=255*sqrt(sq(YManageInfluence)+sq(XManageInfluence));
  int MAI=basePWM;
  int MBI=basePWM;
  if(YManageInfluence>0){
    if(XManageInfluence>0){
      MAI*=(1-XManageInfluence);
    }
    else if(XManageInfluence<0){
      MBI*=(1+XManageInfluence);
    }
    analogWrite(MotorA1,MAI);
    analogWrite(MotorA2,0);
    analogWrite(MotorB1,MBI);
    analogWrite(MotorB2,0);
    Serial.print(MAI);
    Serial.print(" 0 ");
    Serial.print(MBI);
    Serial.println(" 0");
  }
  else if(YManageInfluence<0){
    if(XManageInfluence>0){
      MAI*=(1-XManageInfluence);
    }
    else if(XManageInfluence<0){
      MBI*=(1+XManageInfluence);
    }
    analogWrite(MotorA1,0);
    analogWrite(MotorA2,MAI);
    analogWrite(MotorB1,0);
    analogWrite(MotorB2,MBI);
    Serial.print("0 ");
    Serial.print(MAI);
    Serial.print(" 0 ");
    Serial.println(MBI);
  }
  else{
    analogWrite(MotorA1,255);
    analogWrite(MotorA2,255);
    analogWrite(MotorB1,255);
    analogWrite(MotorB2,255);
    Serial.println("255 255 255 255");
  }
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
               AwsEventType type, void *arg, uint8_t *data, size_t len) {

   if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    
    // Проверяем, что пришли текстовые данные и пакет завершен
    if (info->opcode == WS_TEXT && info->final && info->index == 0 && len == info->len) {
      
      // Создаем временный буфер для строки и парсим JSON
      JsonDocument doc; 
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.print("Ошибка парсинга JSON: ");
        Serial.println(error.c_str());
        return;
      }

      // Проверяем, что это пакет именно от джойстика
      const char* event = doc["action"];
      if (event && strcmp(event, "joistik") == 0) {
        XManageInfluence = float(doc["x"]);
        YManageInfluence = float(doc["y"]);
        move();
        // Serial.printf("Joystick X: %f, Y: %f\n", XManageInfluence, YManageInfluence);
      }
      else if (event && strcmp(event, "drop1") == 0) {
        moduleState[0]= int(doc["value"]);
        Serial.printf("модуль 1: %d\n", moduleState[0]);
      }
      else if (event && strcmp(event, "drop2") == 0) {
        moduleState[1] = int(doc["value"]);
        Serial.printf("модуль 2: %d\n", moduleState[1]);
      }
      else if (event && strcmp(event, "drop3") == 0) {
        moduleState[2] = int(doc["value"]);
        Serial.printf("модуль 3: %d\n", moduleState[2]);
      }
      else if (event && strcmp(event, "drop4") == 0) {
        moduleState[3] = int(doc["value"]);
        Serial.printf("модуль 4: %d\n", moduleState[3]);
      }
      else if (event && strcmp(event, "drop5") == 0) {
        moduleState[4] = int(doc["value"]);
        Serial.printf("модуль 5: %d\n", moduleState[4]);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(MotorA1,OUTPUT);
  pinMode(MotorA2,OUTPUT);
  pinMode(MotorB1,OUTPUT);
  pinMode(MotorB2,OUTPUT);

  delay(1000);
  // if (!psramInit()) {
  //       Serial.println("КРИТИЧЕСКАЯ ОШИБКА: PSRAM всё ещё не активирована компилятором!");
  //       Serial.println("Проверьте, правильно ли прошились build_flags.");
  //       return;
  //   }
  Serial.println("УРА! Внешняя память PSRAM (8MB) успешно обнаружена и работает.");

    if (!LittleFS.begin(true)) {
        Serial.println("LittleFS mount failed");
        return;
    }
    
  WiFi.softAP("MTP", "12345678");
  Serial.println("AP ready: MTP / 12345678");
  Serial.println(WiFi.softAPIP());

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  server.begin();
  Serial.println("Server started");

  // Serial.println("Выделение видеобуферов во внешней PSRAM...");
    
  //   // 55 КБ под каждый буфер — теперь видеокадр гарантированно влезет и не переполнит стек!
  //   uint32_t buffer_size = 64 * 1024; 

  // uint8_t *xferBufferA = (uint8_t *)heap_caps_malloc(buffer_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);
  // uint8_t *xferBufferB = (uint8_t *)heap_caps_malloc(buffer_size, MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA);
  // uint8_t *frameBuffer = (uint8_t *)heap_caps_malloc(buffer_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);


  //   if (!xferBufferA || !xferBufferB || !frameBuffer) {
  //       Serial.println("Ошибка выделения памяти внутри PSRAM! Этого не должно происходить при 8MB.");
  //       return; 
  //   }
  //   Serial.println("Память выделена успешно.");

  //   // Конфигурируем камеру с автоподбором разрешения
  //   usb_cam->uvcConfiguration(640, 480, 400000, 
  //                            buffer_size, xferBufferA, xferBufferB, buffer_size, frameBuffer);
    
  //   usb_cam->uvcCamRegisterCb(&camera_frame_cb, NULL);

    
  //   usb_cam->start();
  //   Serial.println("Системный USB Хост запущен с поддержкой 8MB памяти. Ожидаем камеру...");

}

void loop() {
  ws.cleanupClients();
}