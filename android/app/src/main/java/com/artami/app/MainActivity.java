package com.artami.app;

import android.os.Bundle;
import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse("https://financedashv1.vercel.app/dashboard");
    }
}
