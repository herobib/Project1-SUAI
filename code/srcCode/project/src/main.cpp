#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Wire.h>

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
int moduleState[] ={0,0,0,0,0};
float XManageInfluence=0.0f;
float YManageInfluence=0.0f;

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
        Serial.printf("Joystick X: %f, Y: %f\n", XManageInfluence, YManageInfluence);
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

}

void loop() {
  ws.cleanupClients();
}