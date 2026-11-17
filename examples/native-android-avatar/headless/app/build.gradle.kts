plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// PARTNER_ID / WIDGET_ID come from the .env file in the project folder (copy .env.example to create it).
// Without a .env they fall back to a Gradle property (-PPARTNER_ID=...) and then an environment variable, for CI.
// Reading the file through `providers` makes it a tracked build input, so editing it invalidates the configuration cache.
val dotEnv: Map<String, String> = providers
    .fileContents(rootProject.layout.projectDirectory.file(".env"))
    .asText
    .getOrElse("")
    .lineSequence()
    .map { it.trim() }
    .filter { it.isNotEmpty() && !it.startsWith("#") && "=" in it }
    .associate { it.substringBefore("=").trim() to it.substringAfter("=").trim().trim('"', '\'') }

fun config(name: String): String = dotEnv[name]?.takeIf { it.isNotBlank() }
    ?: providers.gradleProperty(name).orNull
    ?: providers.environmentVariable(name).orNull
    ?: ""

val partnerId = config("PARTNER_ID")
val widgetId = config("WIDGET_ID")

if (partnerId.toLongOrNull() == null || widgetId.isBlank()) {
    logger.warn("PARTNER_ID / WIDGET_ID are not set (PARTNER_ID must be a number). Copy .env.example to .env and fill them in; the avatar will not start without them.")
}

fun buildConfigString(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "com.kaltura.avatar"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.kaltura.avatar"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        buildConfigField("String", "PARTNER_ID", buildConfigString(partnerId))
        buildConfigField("String", "WIDGET_ID", buildConfigString(widgetId))

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // Signed with the debug key so `installRelease` works for testing. Use your own keystore for Google Play.
            signingConfig = signingConfigs.getByName("debug")
            optimization {
                enable = true
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}