<script setup lang="ts">
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { detectOs, type Os } from '@/lib/platform'

/**
 * What to do about the single most common failure state for a newcomer:
 * typing Khmer drills on a Latin keyboard layout.
 *
 * This used to be a toast that expired in three seconds and took the
 * instructions with it. Following these steps means leaving the browser for
 * system settings and coming back, which is longer than any toast lives — so
 * the panel stays until the problem does.
 */
defineEmits<{ dismiss: [] }>()

/*
 * Detection picks the starting tab and nothing else; all three sets of steps
 * stay one click away. Read once at setup — the user's OS is not going to
 * change mid-drill.
 */
const activeOs = ref<Os>(detectOs(navigator.userAgent))
</script>

<template>
  <section class="layout-setup" aria-labelledby="layout-setup-heading">
    <header>
      <h2 id="layout-setup-heading">That was a Latin letter — no Khmer layout is active</h2>
      <Button
        icon="pi pi-times"
        @click="$emit('dismiss')"
        severity="secondary"
        variant="text"
        rounded
        aria-label="Dismiss layout instructions"
      />
    </header>

    <p class="lede">
      Khmer Type reads what your keyboard actually produces, so it needs a Khmer input source
      installed at the system level. Add one, switch to it, and come back — the drill is still here.
    </p>

    <Tabs v-model:value="activeOs">
      <TabList>
        <Tab value="macos">macOS</Tab>
        <Tab value="windows">Windows</Tab>
        <Tab value="linux">Linux</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="macos">
          <ol>
            <li>Open <strong>System Settings → Keyboard</strong>.</li>
            <li>Under <strong>Text Input</strong>, click <strong>Edit…</strong> beside Input Sources.</li>
            <li>Click <strong>+</strong>, choose <strong>Khmer</strong>, and add it.</li>
            <li>Switch layouts with <kbd>Control</kbd> + <kbd>Space</kbd>, or from the input menu in the menu bar.</li>
          </ol>
          <!--
            Apple's input source is named "Khmer" but is not NiDA — it differs
            on ten keys. See docs/adr/0003-two-layout-variants-user-overridable.md.
          -->
          <p class="note">
            Apple's “Khmer” differs from the NiDA standard on a handful of keys, including the
            spacebar. Khmer Type works that out from your typing.
          </p>
        </TabPanel>

        <TabPanel value="windows">
          <ol>
            <li>Open <strong>Settings → Time &amp; language → Language &amp; region</strong>.</li>
            <li>Add <strong>Khmer</strong> as a language, or open the <strong>…</strong> menu beside it if it is already listed.</li>
            <li>In <strong>Language options → Keyboards</strong>, add <strong>Khmer (NIDA)</strong>.</li>
            <li>Switch layouts with <kbd>Windows</kbd> + <kbd>Space</kbd>.</li>
          </ol>
          <p class="note">
            Windows ships two Khmer keyboards. <strong>Khmer (NIDA)</strong> is the one this trainer
            teaches.
          </p>
        </TabPanel>

        <TabPanel value="linux">
          <ol>
            <li>Open your desktop's keyboard settings — on GNOME, <strong>Settings → Keyboard</strong>.</li>
            <li>Under <strong>Input Sources</strong>, click <strong>+</strong> and add <strong>Khmer</strong>.</li>
            <li>Switch layouts with <kbd>Super</kbd> + <kbd>Space</kbd>.</li>
          </ol>
          <p class="note">
            Without a settings app: <code>setxkbmap kh</code> for X11, or add the <code>kh</code>
            layout to your compositor's input configuration on Wayland.
          </p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

<style scoped>
/*
 * The one panel the design keeps a surface under. It interrupts a drill to say
 * something has gone wrong, which is the single case where a block of colour is
 * doing work rather than decorating — everything else on the page sits directly
 * on the background.
 */
.layout-setup {
  max-width: var(--kt-measure-drill);
  width: 100%;
  padding: 16px 20px;
  border-radius: var(--p-border-radius-lg);
  background-color: var(--kt-surface);
  border-left: 2px solid var(--kt-accent);
  text-align: left;

  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;

    h2 {
      margin: 0;
      font-size: 0.8125rem;
      letter-spacing: 0.02em;
      color: var(--kt-accent);
    }
  }

  .lede {
    margin: 0.6rem 0 0;
    color: var(--kt-sub);
    font-size: 0.75rem;
    line-height: 1.7;
  }

  ol {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.75rem;
    line-height: 1.9;
    color: var(--kt-text);
  }

  strong {
    font-weight: 500;
    color: var(--kt-text);
  }

  .note {
    margin: 0.75rem 0 0;
    color: var(--kt-sub);
    font-size: 0.75rem;
    line-height: 1.7;
  }

  kbd,
  code {
    padding: 0.1em 0.4em;
    border-radius: var(--p-border-radius-sm);
    background-color: var(--kt-surface-dim);
    color: var(--kt-sub);
    font-size: 0.9em;
    font-family: inherit;
  }

  :deep(.p-tab) {
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    text-transform: lowercase;
  }
}
</style>
