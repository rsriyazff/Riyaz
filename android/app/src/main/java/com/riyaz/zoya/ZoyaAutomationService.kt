package com.riyaz.zoya

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.content.Intent
import android.net.Uri

class ZoyaAutomationService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Zoya is monitoring system events to help you
    }

    override fun onInterrupt() {}

    /**
     * Zoya's core automation functions triggered by voice
     */
    fun performAction(command: String, target: String? = null) {
        when (command) {
            "SCROLL_DOWN" -> {
                rootInActiveWindow?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
            }
            "CLICK_SEND" -> {
                // Find "Send" button in WhatsApp or Messenger
                findAndClick("Send")
                findAndClick("bhejo") // Hindi localization
            }
            "OPEN_APP" -> {
                val intent = packageManager.getLaunchIntentForPackage(target ?: "")
                intent?.let { startActivity(it) }
            }
        }
    }

    private fun findAndClick(text: String) {
        val nodes = rootInActiveWindow?.findAccessibilityNodeInfosByText(text)
        nodes?.forEach { node ->
            if (node.isClickable) {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
        }
    }
}
