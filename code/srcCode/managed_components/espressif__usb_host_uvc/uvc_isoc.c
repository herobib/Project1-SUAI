/*
 * SPDX-FileCopyrightText: 2024-2025 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: Apache-2.0
 */

#include <stdbool.h>
#include <string.h> // For memcpy

#include "esp_log.h"

#include "uvc_stream.h" // For uvc_host_stream_pause()
#include "uvc_types_priv.h"
#include "uvc_check_priv.h"
#include "uvc_frame_priv.h"
#include "uvc_critical_priv.h"

static const char *TAG = "uvc-isoc";

/**
 * @brief Callback function for handling Isochronous USB transfers from a UVC camera.
 *
 * This function processes isochronous transfer packets, which may contain video frame data. The following key points
 * are handled in the transfer:
 *
 * - **Start of Frame (SoF)**: Detected by a change in Frame ID, which toggles between 0 and 1.
 * - **End of Frame (EoF)**: Signaled in the packet header.
 * - **Transfer Characteristics**:
 *   - **No CRC**: Data corruption is possible.
 *   - **No ACK**: Packets can be missed.
 *   - **Packet Header**: Each packet includes a header used to detect errors, missed packets, and other issues.
 *
 * The callback performs the following tasks:
 * 1. Checks the status of each isochronous packet and handles various USB transfer statuses (e.g., completed,
 *    error, device disconnected).
 * 2. Parses packet headers to detect the start of new frames, handles errors, and manages frame buffers.
 * 3. Aggregates valid data into a frame buffer, ensuring no buffer overflow occurs.
 * 4. Signals the end of a frame and invokes user-defined callbacks if necessary.
 *
 * @param[in] transfer Pointer to the completed USB transfer structure.
 */
void isoc_transfer_callback(usb_transfer_t *transfer)
{
    ESP_LOGD(TAG, "%s", __FUNCTION__);
    uvc_stream_t *uvc_stream = (uvc_stream_t *)transfer->context;

    // USB_TRANSFER_STATUS_NO_DEVICE is set in transfer->status.
    // Other error codes are saved in status of each ISOC packet descriptor
    if (transfer->status == USB_TRANSFER_STATUS_NO_DEVICE) {
        ESP_ERROR_CHECK(uvc_host_stream_pause(uvc_stream)); // This should never fail
    }

    if (!UVC_ATOMIC_LOAD(uvc_stream->dynamic.streaming)) {
        return; // If the streaming was turned off, we don't have to do anything
    }

    const uint8_t *payload = transfer->data_buffer;
    for (int i = 0; i < transfer->num_isoc_packets; i++) {
        usb_isoc_packet_desc_t *isoc_desc = &transfer->isoc_packet_desc[i];

        // Check USB status
        switch (isoc_desc->status) {
        case USB_TRANSFER_STATUS_COMPLETED:
            break;
        case USB_TRANSFER_STATUS_NO_DEVICE:
        case USB_TRANSFER_STATUS_CANCELED:
            ESP_ERROR_CHECK(uvc_host_stream_pause(uvc_stream)); // This should never fail
            return; // No need to process the rest
        case USB_TRANSFER_STATUS_ERROR:
        case USB_TRANSFER_STATUS_OVERFLOW:
        case USB_TRANSFER_STATUS_STALL:
            ESP_LOGW(TAG,
             "ISOC error: status=%d, packet=%d/%d, actual=%d, requested=%d, transfer_status=%d",
             (int)isoc_desc->status,
             i,
             transfer->num_isoc_packets,
             (int)isoc_desc->actual_num_bytes,
             (int)isoc_desc->num_bytes,
             (int)transfer->status);

                uvc_stream->single_thread.skip_current_frame = true;
            goto next_isoc_packet; // Data corrupted

        case USB_TRANSFER_STATUS_TIMED_OUT:
        case USB_TRANSFER_STATUS_SKIPPED:
                {
                static int lost = 0;
                if (lost < 60) {
                    lost++;
                    ESP_LOGW(TAG, "LOST p%02d status=%d act=%d/%d", i, (int)isoc_desc->status,
                             (int)isoc_desc->actual_num_bytes, (int)isoc_desc->num_bytes);
                }
            }
            goto next_isoc_packet; // Skipped and timed out ISOC transfers are not an issue
        default:
            assert(false);
        }
        
        // Check for start of new frame
        const uvc_payload_header_t *payload_header = (const uvc_payload_header_t *)payload;
        if (!uvc_frame_payload_header_validate(payload_header, isoc_desc->actual_num_bytes)) {
            ESP_LOGD(TAG, "invalid UVC payload header, %02x, %02x, len:%d", payload[0], payload[1], isoc_desc->actual_num_bytes);
            if (isoc_desc->actual_num_bytes != 0) {
                // Only skip the frame if we received some data (otherwise it's just an empty packet, which is not an issue by itself)
                uvc_stream->single_thread.skip_current_frame = true;
            }
            goto next_isoc_packet;
        }
        {
    static bool armed = false;
    static int dump_left = 0;
    const int n = isoc_desc->actual_num_bytes;
    if (!armed && n > 16) { armed = true; dump_left = 60; }  // старт с первого пакета с данными
    if (armed && dump_left > 0) {
        dump_left--;
        ESP_LOGW(TAG, "p%02d act=%d/%d hdr=%02x %02x | %02x %02x %02x %02x",
                 i, n, (int)isoc_desc->num_bytes,
                 n > 0 ? payload[0] : 0, n > 1 ? payload[1] : 0,
                 n > 12 ? payload[12] : 0, n > 13 ? payload[13] : 0,
                 n > 14 ? payload[14] : 0, n > 15 ? payload[15] : 0);
    }
}


        // Derive payload data pointer/length once and reuse below
        const uint8_t *payload_data = payload + payload_header->bHeaderLength;
        const size_t payload_data_len = isoc_desc->actual_num_bytes - payload_header->bHeaderLength;

        {
    static int shown = 0;
    if (shown < 2 && payload_data_len > 100) {   // только первый (большой) пакет кадра
        shown++;
        ESP_LOGW(TAG, "frame head: fid=%d len=%u",
                 payload_header->bmHeaderInfo.frame_id, (unsigned)payload_data_len);
        ESP_LOG_BUFFER_HEX(TAG, payload_data, payload_data_len);
    }
} 
        if (payload_data_len == 0) {
            // This is a zero-length packet, skip it
            ESP_LOGD(TAG, "zero-length packet, skipping");
            goto next_isoc_packet;
        }

#ifdef CONFIG_UVC_CHECK_PAYLOAD_HEADER_ERR
        // Check for error flag
        if (payload_header->bmHeaderInfo.error) {
            ESP_LOGW(TAG, "frame error");
            uvc_stream->single_thread.skip_current_frame = true;
        }
#endif // CONFIG_UVC_CHECK_PAYLOAD_HEADER_ERR

        const bool start_of_frame = (uvc_stream->single_thread.current_frame_id != payload_header->bmHeaderInfo.frame_id);
        if (start_of_frame) {
            /* A frame still open at the frame-ID toggle means the camera sent no EoF.
             * Deliver it here, while skip_current_frame still describes it. */
            UVC_ENTER_CRITICAL();
            uvc_host_frame_t *unterminated_frame = uvc_stream->dynamic.current_frame;
            uvc_stream->dynamic.current_frame = NULL;
            const bool invoke_unterminated_cb = (uvc_stream->dynamic.streaming && uvc_stream->constant.frame_cb &&
                                                 unterminated_frame && !uvc_stream->single_thread.skip_current_frame);
            UVC_EXIT_CRITICAL();

            if (unterminated_frame) {
                bool return_frame = true;
                if (invoke_unterminated_cb) {
                    return_frame = uvc_stream->constant.frame_cb(unterminated_frame, uvc_stream->constant.cb_arg);
                }
                if (return_frame) {
                    uvc_host_frame_return(uvc_stream, unterminated_frame);
                }
            }

            // We detected start of new frame. Update Frame ID and start fetching this frame
            uvc_stream->single_thread.current_frame_id   = payload_header->bmHeaderInfo.frame_id;
#ifdef CONFIG_UVC_CHECK_PAYLOAD_HEADER_ERR
            uvc_stream->single_thread.skip_current_frame = payload_header->bmHeaderInfo.error;
#else
            uvc_stream->single_thread.skip_current_frame = false;
#endif // CONFIG_UVC_CHECK_PAYLOAD_HEADER_ERR

            // Check mjpeg frame start
    //         if (uvc_stream->dynamic.vs_format.format == UVC_VS_FORMAT_MJPEG &&
    //     (payload_data[0] != JPEG_MARKER || payload_data[1] != JPEG_SOI)) {
    // uvc_stream->single_thread.skip_current_frame = true;
    // ESP_LOGW(TAG, "invalid MJPEG SOI: hdr_len=%u hdr[0..1]=%02x %02x data: %02x %02x %02x %02x %02x %02x %02x %02x",
    //          payload_header->bHeaderLength,
    //          ((const uint8_t *)payload_header)[0], ((const uint8_t *)payload_header)[1],
    //          payload_data[0], payload_data[1], payload_data[2], payload_data[3],
    //          payload_data[4], payload_data[5], payload_data[6], payload_data[7]);
    //         }
            // Check mjpeg frame start (only if this packet actually carries data)
            if (uvc_stream->dynamic.vs_format.format == UVC_VS_FORMAT_MJPEG &&
                    payload_data_len >= 2 &&
                    (payload_data[0] != JPEG_MARKER || payload_data[1] != JPEG_SOI)) {
                uvc_stream->single_thread.skip_current_frame = true;
                ESP_LOGW(TAG, "invalid MJPEG SOI: actual=%d hdr_len=%u data_len=%u",
                         (int)isoc_desc->actual_num_bytes,
                         payload_header->bHeaderLength, (unsigned)payload_data_len);
            }

            // Get free frame buffer for this new frame
            UVC_ENTER_CRITICAL();
            const bool need_new_frame = (uvc_stream->dynamic.streaming && !uvc_stream->dynamic.current_frame);
            if (need_new_frame) {
                UVC_EXIT_CRITICAL();
                uvc_stream->dynamic.current_frame = uvc_frame_get_empty(uvc_stream);
                if (uvc_stream->dynamic.current_frame == NULL) {
                    // There is no free frame buffer now, skipping this frame
                    uvc_stream->single_thread.skip_current_frame = true;

                    // Inform the user about the underflow
                    uvc_host_stream_callback_t stream_cb = uvc_stream->constant.stream_cb;
                    if (stream_cb) {
                        const uvc_host_stream_event_data_t event = {
                            .type = UVC_HOST_FRAME_BUFFER_UNDERFLOW,
                        };
                        stream_cb(&event, uvc_stream->constant.cb_arg);
                    }
                    goto next_isoc_packet;
                }
            } else {
                // Streaming was stopped in the meantime: no buffer to write this payload into
                UVC_EXIT_CRITICAL();
                uvc_stream->single_thread.skip_current_frame = true;
            }
        }

        // Add received data to frame buffer
        if (!uvc_stream->single_thread.skip_current_frame) {
            uvc_host_frame_t *current_frame = UVC_ATOMIC_LOAD(uvc_stream->dynamic.current_frame);

            esp_err_t ret = uvc_frame_add_data(current_frame, payload_data, payload_data_len);
            if (ret != ESP_OK) {
                // Frame buffer overflow, skip this frame
                uvc_stream->single_thread.skip_current_frame = true;

                // Inform the user about the overflow
                uvc_host_stream_callback_t stream_cb = uvc_stream->constant.stream_cb;
                if (stream_cb) {
                    const uvc_host_stream_event_data_t event = {
                        .type = UVC_HOST_FRAME_BUFFER_OVERFLOW,
                    };
                    stream_cb(&event, uvc_stream->constant.cb_arg);
                }
                goto next_isoc_packet;
            }
        }

        // End of Frame. Pass the frame to user
        if (payload_header->bmHeaderInfo.end_of_frame) {
            bool return_frame = true; // In case streaming is stopped ATM, we must return the frame

            // Check if the user did not stop the stream in the meantime
            UVC_ENTER_CRITICAL();
            uvc_host_frame_t *this_frame = uvc_stream->dynamic.current_frame;
            uvc_stream->dynamic.current_frame = NULL; // Stop writing more data to this frame

            // Determine if we should invoke the frame callback:
            // Only invoke the callback if streaming is active, a frame callback exists,
            // and we have a valid frame to pass to the user.
            const bool invoke_fb_callback = (uvc_stream->dynamic.streaming && uvc_stream->constant.frame_cb && this_frame && !uvc_stream->single_thread.skip_current_frame);
            UVC_EXIT_CRITICAL();

            if (invoke_fb_callback) {
                return_frame = uvc_stream->constant.frame_cb(this_frame, uvc_stream->constant.cb_arg);
            }
            if (return_frame) {
                // The user has processed the frame in his callback, return it back to empty queue
                uvc_host_frame_return(uvc_stream, this_frame);
            }
        }
next_isoc_packet:
        payload += isoc_desc->num_bytes;
        continue;
    }

    if (UVC_ATOMIC_LOAD(uvc_stream->dynamic.streaming)) {
        usb_host_transfer_submit(transfer); // Restart the transfer
    }
}
