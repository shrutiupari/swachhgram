<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { api, uploadImage } from "./api";

const reports = ref([]);
const stats = ref(null);
const selectedFile = ref(null);
const previewUrl = ref("");
const statusNote = reactive({});
const loading = ref(false);
const submitting = ref(false);
const error = ref("");

const form = reactive({
  address: "",
  village: "",
  ward: "",
  description: "",
});

const pendingReports = computed(() =>
  reports.value.filter((report) => report.status !== "RESOLVED")
);

async function loadReports() {
  loading.value = true;
  error.value = "";

  try {
    const [reportData, statData] = await Promise.all([
      api.getAdminReports(),
      api.getStats(),
    ]);
    reports.value = reportData.reports || [];
    stats.value = statData;
  } catch (err) {
    error.value = err.message || "Unable to load reports";
  } finally {
    loading.value = false;
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
}

async function submitReport() {
  if (!selectedFile.value) {
    error.value = "Please add one clear photo before submitting.";
    return;
  }

  if (!form.address.trim() || !form.village.trim()) {
    error.value = "Address and village/town are required.";
    return;
  }

  submitting.value = true;
  error.value = "";

  try {
    const uploaded = await uploadImage(selectedFile.value);
    const analysis = await api.analyzeImage(uploaded.key);

    await api.createReport({
      photoKey: uploaded.key,
      photoUrl: uploaded.url,
      address: form.address,
      village: form.village,
      ward: form.ward,
      description: form.description,
      severity: analysis.severity,
      isGarbage: analysis.isGarbage,
      aiConfidence: analysis.confidence,
      aiLabels: analysis.detectedLabels,
    });

    selectedFile.value = null;
    previewUrl.value = "";
    form.address = "";
    form.village = "";
    form.ward = "";
    form.description = "";
    await loadReports();
  } catch (err) {
    error.value = err.message || "Report submission failed";
  } finally {
    submitting.value = false;
  }
}

async function updateReportStatus(report, status) {
  try {
    await api.updateStatus(
      report.reportId,
      report.createdAt,
      status,
      statusNote[report.reportId] || ""
    );
    statusNote[report.reportId] = "";
    await loadReports();
  } catch (err) {
    error.value = err.message || "Unable to update status";
  }
}

onMounted(loadReports);
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <div>
        <p class="eyebrow">SwachhGram Vue</p>
        <h1>Report local garbage to the Gram Panchayat</h1>
        <p class="summary">
          A simple one-photo workflow for villages and small towns: capture the
          garbage spot, add an address or landmark, and track cleanup status.
        </p>
      </div>
      <div class="stats" v-if="stats">
        <span>{{ stats.total }} total</span>
        <span>{{ stats.pending }} pending</span>
        <span>{{ stats.resolved }} resolved</span>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <form class="panel" @submit.prevent="submitReport">
        <h2>Citizen report</h2>

        <label>
          Garbage photo
          <input type="file" accept="image/*" @change="handleFileChange" />
        </label>

        <img v-if="previewUrl" :src="previewUrl" alt="Selected garbage" class="preview" />

        <label>
          Address / landmark
          <input v-model="form.address" placeholder="Near school, main road" />
        </label>

        <div class="two-col">
          <label>
            Village / town
            <input v-model="form.village" placeholder="Village name" />
          </label>

          <label>
            Ward
            <input v-model="form.ward" placeholder="Ward no." />
          </label>
        </div>

        <label>
          Description
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Any extra detail for GP staff"
          />
        </label>

        <button :disabled="submitting">
          {{ submitting ? "Submitting..." : "Send to Gram Panchayat" }}
        </button>
      </form>

      <section class="panel">
        <div class="section-header">
          <h2>GP action queue</h2>
          <button type="button" class="secondary" @click="loadReports">Refresh</button>
        </div>

        <p v-if="loading" class="muted">Loading reports...</p>
        <p v-else-if="pendingReports.length === 0" class="muted">
          No open reports right now.
        </p>

        <article v-for="report in pendingReports" :key="report.reportId" class="report-card">
          <img v-if="report.photoUrl" :src="report.photoUrl" alt="Garbage report" />
          <div class="report-body">
            <div class="report-top">
              <strong>{{ report.address || "Address not provided" }}</strong>
              <span>{{ report.status }}</span>
            </div>
            <p>{{ report.village }} <template v-if="report.ward">- Ward {{ report.ward }}</template></p>
            <p v-if="report.description" class="muted">{{ report.description }}</p>
            <p class="muted">
              AI: {{ report.severity || "MEDIUM" }} severity,
              {{ report.aiConfidence || 0 }}% confidence
            </p>

            <textarea
              v-model="statusNote[report.reportId]"
              rows="2"
              placeholder="Optional note for citizen"
            />

            <div class="actions">
              <button type="button" class="secondary" @click="updateReportStatus(report, 'IN_PROGRESS')">
                In progress
              </button>
              <button type="button" @click="updateReportStatus(report, 'RESOLVED')">
                Resolved
              </button>
              <button type="button" class="danger" @click="updateReportStatus(report, 'REJECTED')">
                Reject
              </button>
            </div>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
