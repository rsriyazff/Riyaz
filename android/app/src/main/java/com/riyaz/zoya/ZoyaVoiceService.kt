package com.riyaz.zoya

import android.app.Service
import android.content.Intent
import android.os.IBinder

class ZoyaVoiceService : Service() {

    override fun onCreate() {
        super.onCreate()
        // Zoya Background Voice Engine Initialized
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Keep service alive to process voice assistant streams
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up any micro-listeners
    }
}
