/**
 * TEMPORARY — Milestone 1 endpoint only.
 * Stands in for the real Earth journey so this milestone has a defined finish
 * line. No longer builds its own star field/glow — AmbientBackground has
 * already resolved into its 'space-transition' phase by the time this mounts,
 * so this scene inherits it directly (ARCHITECTURE.md §14/§17). Replaced in
 * Milestone 2 by PersistentVisualLayer + EarthJourneyScene (ARCHITECTURE.md §6).
 */
export function EarthPlaceholderScene() {
  return (
    <section className="earth-placeholder-scene">
      <p className="earth-placeholder-scene__text">Earth journey begins here.</p>
    </section>
  );
}
