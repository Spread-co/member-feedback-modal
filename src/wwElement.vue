<template>
  <teleport to="body" v-if="isOpen && (!content.portalTarget || content.portalTarget === 'member')">
    <div class="mfm-overlay" @click.self="handleClose" role="dialog" aria-modal="true" aria-labelledby="mfm-title">
      <div class="mfm-panel">

        <!-- Header -->
        <div class="mfm-header">
          <h2 class="mfm-title" id="mfm-title">Have your say</h2>
          <button class="mfm-close" @click="handleClose" aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="mfm-tabs" role="tablist">
          <button
            class="mfm-tab"
            :class="{ 'mfm-tab--active': activeTab === 'review' }"
            @click="activeTab = 'review'"
            role="tab"
            :aria-selected="activeTab === 'review'"
            id="tab-review"
            aria-controls="panel-review"
          >
            ★ Write a Review
          </button>
          <button
            v-if="featureUpvoteEnabled"
            class="mfm-tab"
            :class="{ 'mfm-tab--active': activeTab === 'features' }"
            @click="activeTab = 'features'; loadFeatures()"
            role="tab"
            :aria-selected="activeTab === 'features'"
            id="tab-features"
            aria-controls="panel-features"
          >
            💡 Feature Requests
          </button>
        </div>

        <!-- Tab: Review -->
        <div
          v-show="activeTab === 'review'"
          class="mfm-body"
          id="panel-review"
          role="tabpanel"
          aria-labelledby="tab-review"
        >
          <div v-if="reviewSubmitted" class="mfm-success">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mfm-success-icon" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="16 12 12 16 8 12"/><line x1="12" y1="8" x2="12" y2="16"/>
            </svg>
            <p class="mfm-success-text">Thank you for your review! It will be reviewed by our team.</p>
            <button class="mfm-btn mfm-btn--outline" @click="resetReview">Leave another review</button>
          </div>

          <form v-else @submit.prevent="submitReview" class="mfm-form">
            <!-- Category -->
            <div class="mfm-field">
              <label class="mfm-label" for="mfm-category">Category</label>
              <select id="mfm-category" class="mfm-select" v-model="reviewForm.categoryId" required :disabled="categoriesLoading">
                <option value="" disabled>{{ categoriesLoading ? 'Loading…' : 'Pick a category' }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Rating -->
            <div class="mfm-field">
              <span class="mfm-label">Rating</span>
              <div class="mfm-stars" role="group" aria-label="Star rating">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="mfm-star"
                  :class="{ 'mfm-star--filled': n <= reviewForm.rating, 'mfm-star--hover': n <= hoverRating }"
                  @click="reviewForm.rating = n"
                  @mouseenter="hoverRating = n"
                  @mouseleave="hoverRating = 0"
                  :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                  :aria-pressed="n <= reviewForm.rating"
                >★</button>
              </div>
            </div>

            <!-- Comment -->
            <div class="mfm-field">
              <label class="mfm-label" for="mfm-comment">Your review <span class="mfm-optional">(optional)</span></label>
              <textarea
                id="mfm-comment"
                class="mfm-textarea"
                v-model="reviewForm.comment"
                placeholder="Tell us about your experience…"
                rows="4"
                maxlength="1000"
              ></textarea>
              <span class="mfm-char-count">{{ reviewForm.comment.length }}/1000</span>
            </div>

            <div v-if="reviewError" class="mfm-error-msg" role="alert">{{ reviewError }}</div>

            <button
              type="submit"
              class="mfm-btn mfm-btn--primary"
              :disabled="reviewLoading || !reviewForm.categoryId || reviewForm.rating === 0"
            >
              {{ reviewLoading ? 'Submitting…' : 'Submit Review' }}
            </button>
          </form>
        </div>

        <!-- Tab: Features -->
        <div
          v-show="activeTab === 'features' && featureUpvoteEnabled"
          class="mfm-body"
          id="panel-features"
          role="tabpanel"
          aria-labelledby="tab-features"
        >
          <p class="mfm-features-intro">Vote on features you'd like us to build next.</p>

          <div v-if="featuresLoading" class="mfm-loading">
            <span class="mfm-spinner" aria-label="Loading features"></span>
          </div>

          <div v-else-if="features.length === 0" class="mfm-empty">
            No feature requests yet. Check back soon!
          </div>

          <ul v-else class="mfm-features-list">
            <li
              v-for="feature in features"
              :key="feature.id"
              class="mfm-feature-card"
            >
              <div class="mfm-feature-info">
                <span class="mfm-feature-title">{{ feature.title }}</span>
                <span v-if="feature.description" class="mfm-feature-desc">{{ feature.description }}</span>
              </div>
              <div class="mfm-feature-vote">
                <button
                  class="mfm-vote-btn mfm-vote-btn--up"
                  :class="{ 'mfm-vote-btn--active': feature.user_vote === 'up' }"
                  @click="castVote(feature, 'up')"
                  :disabled="voteLoadingId === feature.id"
                  :aria-label="`Upvote: ${feature.title}`"
                  :aria-pressed="feature.user_vote === 'up'"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <span class="mfm-vote-score" :class="{ 'mfm-vote-score--up': feature.net_score > 0, 'mfm-vote-score--down': feature.net_score < 0 }">
                  {{ feature.net_score > 0 ? '+' : '' }}{{ feature.net_score }}
                </span>
                <button
                  class="mfm-vote-btn mfm-vote-btn--down"
                  :class="{ 'mfm-vote-btn--active': feature.user_vote === 'down' }"
                  @click="castVote(feature, 'down')"
                  :disabled="voteLoadingId === feature.id"
                  :aria-label="`Downvote: ${feature.title}`"
                  :aria-pressed="feature.user_vote === 'down'"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
            </li>
          </ul>

          <div v-if="featuresError" class="mfm-error-msg" role="alert">{{ featuresError }}</div>
        </div>

      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';

// ── Inline Supabase client ─────────────────────────────────────────────────
function createSpreadClient(supabaseUrl, supabaseAnonKey, accessToken = null) {
  const headers = { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return {
    async rpc(fn, params = {}) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(params),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || res.statusText);
      }
      return res.json();
    },
  };
}

export default {
  props: {
    uid: { type: String, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content:        { type: Object, required: true },
    wwFrontState:   { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },
  emits: ['trigger-event', 'update:content'],

  setup(props, { emit }) {
    // ── Derived props (safe access) ──────────────────────────────────────
    const isOpen              = computed(() => props.content?.isOpen ?? false);
    const supabaseUrl         = computed(() => props.content?.supabaseUrl || '');
    const supabaseAnonKey     = computed(() => props.content?.supabaseAnonKey || '');
    const accessToken         = computed(() => props.content?.accessToken || '');

    // ── State ────────────────────────────────────────────────────────────
    const activeTab           = ref('review');
    const featureUpvoteEnabled = ref(true);

    // Review form
    const categories          = ref([]);
    const categoriesLoading   = ref(false);
    const hoverRating         = ref(0);
    const reviewForm          = ref({ categoryId: '', rating: 0, comment: '' });
    const reviewLoading       = ref(false);
    const reviewError         = ref(null);
    const reviewSubmitted     = ref(false);

    // Features
    const features            = ref([]);
    const featuresLoading     = ref(false);
    const featuresError       = ref(null);
    const voteLoadingId       = ref(null);

    // ── Client factory ───────────────────────────────────────────────────
    function client(authed = true) {
      return createSpreadClient(
        supabaseUrl.value,
        supabaseAnonKey.value,
        authed ? accessToken.value : null,
      );
    }

    // ── Load platform settings + categories on open ───────────────────
    async function loadInitialData() {
      if (!supabaseUrl.value || !supabaseAnonKey.value) return;
      try {
        const settings = await client(false).rpc('get_platform_settings');
        featureUpvoteEnabled.value = settings?.feature_upvote_enabled ?? true;
      } catch (_) {
        featureUpvoteEnabled.value = true; // safe default
      }
      await loadCategories();
    }

    async function loadCategories() {
      categoriesLoading.value = true;
      try {
        const data = await client(false).rpc('get_review_categories');
        categories.value = Array.isArray(data) ? data : [];
      } catch (err) {
        categories.value = [];
      } finally {
        categoriesLoading.value = false;
      }
    }

    // ── Submit review ────────────────────────────────────────────────────
    async function submitReview() {
      if (!reviewForm.value.categoryId || reviewForm.value.rating === 0) return;
      reviewLoading.value = true;
      reviewError.value = null;
      try {
        await client(true).rpc('submit_review', {
          p_category_id: reviewForm.value.categoryId,
          p_rating: reviewForm.value.rating,
          p_comment: reviewForm.value.comment || null,
        });
        reviewSubmitted.value = true;
        emit('trigger-event', {
          name: 'feedback:reviewSubmitted',
          event: {
            categoryId: reviewForm.value.categoryId,
            rating: reviewForm.value.rating,
            comment: reviewForm.value.comment,
          },
        });
      } catch (err) {
        reviewError.value = err.message || 'Failed to submit review. Please try again.';
        emit('trigger-event', { name: 'feedback:error', event: { message: reviewError.value } });
      } finally {
        reviewLoading.value = false;
      }
    }

    function resetReview() {
      reviewForm.value  = { categoryId: '', rating: 0, comment: '' };
      hoverRating.value = 0;
      reviewError.value = null;
      reviewSubmitted.value = false;
    }

    // ── Load features ────────────────────────────────────────────────────
    async function loadFeatures() {
      if (featuresLoading.value) return;
      featuresLoading.value = true;
      featuresError.value = null;
      try {
        const data = await client(true).rpc('get_features_for_voting');
        features.value = Array.isArray(data) ? data : [];
      } catch (err) {
        featuresError.value = err.message || 'Could not load feature requests.';
        features.value = [];
      } finally {
        featuresLoading.value = false;
      }
    }

    // ── Cast / toggle vote ────────────────────────────────────────────────
    async function castVote(feature, voteType) {
      if (!accessToken.value) return;
      voteLoadingId.value = feature.id;
      try {
        const isToggleOff = feature.user_vote === voteType;
        if (isToggleOff) {
          await client(true).rpc('remove_vote_on_feature', { p_feature_id: feature.id });
          feature.net_score += voteType === 'up' ? -1 : 1;
          feature.user_vote = null;
        } else {
          if (feature.user_vote) {
            // switching vote direction
            feature.net_score += voteType === 'up' ? 2 : -2;
          } else {
            feature.net_score += voteType === 'up' ? 1 : -1;
          }
          await client(true).rpc('vote_on_feature', {
            p_feature_id: feature.id,
            p_vote: voteType === 'up' ? 1 : -1,
          });
          feature.user_vote = voteType;
        }
        emit('trigger-event', {
          name: 'feedback:voteRecorded',
          event: { featureId: feature.id, voteType },
        });
      } catch (err) {
        featuresError.value = err.message || 'Vote failed. Please try again.';
        // reload to restore true state
        await loadFeatures();
      } finally {
        voteLoadingId.value = null;
      }
    }

    // ── Close ────────────────────────────────────────────────────────────
    function handleClose() {
      emit('trigger-event', { name: 'feedback:close', event: {} });
      emit('update:content', { isOpen: false });
    }

    // ── Keyboard trap (Escape closes) ─────────────────────────────────────
    function onKeydown(e) {
      if (e.key === 'Escape' && isOpen.value) handleClose();
    }

    // ── Watchers ─────────────────────────────────────────────────────────
    watch(isOpen, (val) => {
      if (val) {
        resetReview();
        activeTab.value = 'review';
        features.value = [];
        loadInitialData();
        try { wwLib.getFrontDocument().addEventListener('keydown', onKeydown); } catch (_) {}
      } else {
        try { wwLib.getFrontDocument().removeEventListener('keydown', onKeydown); } catch (_) {}
      }
    });

    // ── Editor mock data ──────────────────────────────────────────────────
    /* wwEditor:start */
    categories.value = [
      { id: 'a', name: 'Product Quality' },
      { id: 'b', name: 'Delivery' },
      { id: 'c', name: 'Overall Experience' },
    ];
    featureUpvoteEnabled.value = true;
    features.value = [
      { id: '1', title: 'Recurring orders', description: 'Auto-schedule weekly boxes.', net_score: 14, user_vote: null },
      { id: '2', title: 'Wishlist / save for later', description: null, net_score: 7, user_vote: 'up' },
      { id: '3', title: 'SMS delivery notifications', description: 'Text updates on delivery day.', net_score: -2, user_vote: null },
    ];
    /* wwEditor:end */

    return {
      isOpen, activeTab, featureUpvoteEnabled,
      categories, categoriesLoading, hoverRating,
      reviewForm, reviewLoading, reviewError, reviewSubmitted,
      features, featuresLoading, featuresError, voteLoadingId,
      submitReview, resetReview, loadFeatures,
      castVote, handleClose,
    };
  },
};
</script>

<style scoped>
/* ── Design tokens ─────────────────────────────────────────────────────── */
.mfm-overlay {
  --mfm-primary: #4B162D;
  --mfm-accent: #C86A3A;
  --mfm-accent-hover: #b55e31;
  --mfm-success: #16A34A;
  --mfm-error: #DC2626;
  --mfm-sand: #EDC79F;
  --mfm-bg: #FAF7F2;
  --mfm-surface: #FFFFFF;
  --mfm-border: #E8DDD4;
  --mfm-text: #1A0A10;
  --mfm-text-secondary: #6B5B52;
  --mfm-radius-sm: 6px;
  --mfm-radius-md: 10px;
  --mfm-radius-lg: 16px;
  --mfm-font: 'Work Sans', -apple-system, sans-serif;
}

/* ── Overlay ───────────────────────────────────────────────────────────── */
.mfm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  animation: mfm-fade-in 0.2s ease;
}

@keyframes mfm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (min-width: 640px) {
  .mfm-overlay {
    align-items: center;
    padding: 1.5rem;
  }
}

/* ── Panel ─────────────────────────────────────────────────────────────── */
.mfm-panel {
  background: var(--mfm-surface);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  border-radius: var(--mfm-radius-lg) var(--mfm-radius-lg) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: mfm-slide-up 0.25s ease-out;
  font-family: var(--mfm-font);
}

@keyframes mfm-slide-up {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@media (min-width: 640px) {
  .mfm-panel {
    border-radius: var(--mfm-radius-lg);
    animation: mfm-scale-in 0.2s ease-out;
    max-height: 85vh;
  }
  @keyframes mfm-scale-in {
    from { transform: scale(0.96); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
}

@media (min-width: 1024px) {
  .mfm-panel { max-width: 680px; }
}

/* ── Header ────────────────────────────────────────────────────────────── */
.mfm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
  flex-shrink: 0;
}

.mfm-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--mfm-primary);
  margin: 0;
}

.mfm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: var(--mfm-bg);
  border-radius: var(--mfm-radius-sm);
  color: var(--mfm-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.mfm-close:hover {
  background: var(--mfm-border);
  color: var(--mfm-text);
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.mfm-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
  border-bottom: 1px solid var(--mfm-border);
  flex-shrink: 0;
}

.mfm-tab {
  flex: 1;
  padding: 10px 12px;
  font-family: var(--mfm-font);
  font-size: 14px;
  font-weight: 600;
  color: var(--mfm-text-secondary);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
  white-space: nowrap;
}

.mfm-tab:hover {
  color: var(--mfm-primary);
}

.mfm-tab--active {
  color: var(--mfm-primary);
  border-bottom-color: var(--mfm-accent);
}

/* ── Body ──────────────────────────────────────────────────────────────── */
.mfm-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* ── Form ──────────────────────────────────────────────────────────────── */
.mfm-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mfm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mfm-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--mfm-text);
}

.mfm-optional {
  font-weight: 400;
  color: var(--mfm-text-secondary);
  font-size: 13px;
}

.mfm-select {
  padding: 10px 12px;
  border: 1.5px solid var(--mfm-border);
  border-radius: var(--mfm-radius-md);
  font-family: var(--mfm-font);
  font-size: 14px;
  color: var(--mfm-text);
  background: var(--mfm-surface);
  cursor: pointer;
  transition: border-color 0.15s ease;
  appearance: auto;
}

.mfm-select:focus {
  outline: none;
  border-color: var(--mfm-accent);
}

/* ── Stars ─────────────────────────────────────────────────────────────── */
.mfm-stars {
  display: flex;
  gap: 4px;
}

.mfm-star {
  font-size: 32px;
  line-height: 1;
  color: var(--mfm-border);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.1s ease, transform 0.1s ease;
}

.mfm-star--filled,
.mfm-star--hover {
  color: var(--spread-accent, #CE6632);
}

.mfm-star:hover {
  transform: scale(1.15);
}

/* ── Textarea ──────────────────────────────────────────────────────────── */
.mfm-textarea {
  padding: 10px 12px;
  border: 1.5px solid var(--mfm-border);
  border-radius: var(--mfm-radius-md);
  font-family: var(--mfm-font);
  font-size: 14px;
  color: var(--mfm-text);
  resize: vertical;
  transition: border-color 0.15s ease;
}

.mfm-textarea:focus {
  outline: none;
  border-color: var(--mfm-accent);
}

.mfm-char-count {
  font-size: 12px;
  color: var(--mfm-text-secondary);
  text-align: right;
}

/* ── Buttons ───────────────────────────────────────────────────────────── */
.mfm-btn {
  padding: 12px 24px;
  font-family: var(--mfm-font);
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--mfm-radius-md);
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
  border: none;
}

.mfm-btn--primary {
  background: var(--mfm-accent);
  color: #fff;
}

.mfm-btn--primary:hover:not(:disabled) {
  background: var(--mfm-accent-hover);
}

.mfm-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mfm-btn--outline {
  background: none;
  border: 1.5px solid var(--mfm-accent);
  color: var(--mfm-accent);
  margin-top: 8px;
}

.mfm-btn--outline:hover {
  background: rgba(200, 106, 58, 0.06);
}

/* ── Error / success ───────────────────────────────────────────────────── */
.mfm-error-msg {
  font-size: 13px;
  color: var(--mfm-error);
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: var(--mfm-radius-sm);
  border-left: 3px solid var(--mfm-error);
}

.mfm-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
  gap: 12px;
}

.mfm-success-icon {
  color: var(--mfm-success);
}

.mfm-success-text {
  font-size: 15px;
  color: var(--mfm-text);
  margin: 0;
}

/* ── Loading / empty ───────────────────────────────────────────────────── */
.mfm-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.mfm-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--mfm-border);
  border-top-color: var(--mfm-accent);
  border-radius: 50%;
  animation: mfm-spin 0.65s linear infinite;
  display: inline-block;
}

@keyframes mfm-spin {
  to { transform: rotate(360deg); }
}

.mfm-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--mfm-text-secondary);
  font-size: 14px;
}

/* ── Features list ─────────────────────────────────────────────────────── */
.mfm-features-intro {
  font-size: 14px;
  color: var(--mfm-text-secondary);
  margin: 0 0 16px;
}

.mfm-features-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mfm-feature-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid var(--mfm-border);
  border-radius: var(--mfm-radius-md);
  background: var(--mfm-bg);
  transition: border-color 0.12s ease;
}

.mfm-feature-card:hover {
  border-color: var(--mfm-sand);
}

.mfm-feature-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mfm-feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--mfm-text);
}

.mfm-feature-desc {
  font-size: 13px;
  color: var(--mfm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Vote controls ─────────────────────────────────────────────────────── */
.mfm-feature-vote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.mfm-vote-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--mfm-radius-sm);
  border: 1.5px solid var(--mfm-border);
  background: var(--mfm-surface);
  color: var(--mfm-text-secondary);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.mfm-vote-btn:hover:not(:disabled) {
  border-color: var(--mfm-accent);
  color: var(--mfm-accent);
}

.mfm-vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mfm-vote-btn--up.mfm-vote-btn--active {
  background: rgba(45, 106, 79, 0.12);
  border-color: #2D6A4F;
  color: #2D6A4F;
}

.mfm-vote-btn--down.mfm-vote-btn--active {
  background: rgba(220, 38, 38, 0.08);
  border-color: var(--mfm-error);
  color: var(--mfm-error);
}

.mfm-vote-score {
  font-size: 12px;
  font-weight: 700;
  color: var(--mfm-text-secondary);
  min-width: 22px;
  text-align: center;
}

.mfm-vote-score--up   { color: var(--mfm-accent);  }
.mfm-vote-score--down { color: var(--mfm-error);   }
</style>
