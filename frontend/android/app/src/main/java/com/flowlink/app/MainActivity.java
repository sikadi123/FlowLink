package com.flowlink.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final int MEDIA_PERMISSION_REQUEST = 1001;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestMediaPermissionsIfNeeded();
  }

  private void requestMediaPermissionsIfNeeded() {
    boolean cameraDenied = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED;
    boolean audioDenied = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED;
    if (cameraDenied || audioDenied) {
      ActivityCompat.requestPermissions(
          this,
          new String[] { Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO },
          MEDIA_PERMISSION_REQUEST
      );
    }
  }
}
