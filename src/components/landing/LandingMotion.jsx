"use client"

import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { getHeroMorphTransform, getHeroProductTravel } from "./heroMorph"

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function LandingMotion({ ctaHref = "/dashboard" }) {
  const progressRef = useRef(null)
  const [showMobileCta, setShowMobileCta] = useState(false)

  useGSAP(() => {
    const media = gsap.matchMedia()
    const utilityTriggers = []

    media.add({
      motion: "(prefers-reduced-motion: no-preference)",
      desktop: "(min-width: 48rem)",
    }, (context) => {
      if (!context.conditions.motion) return
      const desktop = context.conditions.desktop
      gsap.utils.toArray(".landing-page [data-reveal]").forEach((element) => {
        if (desktop && element.matches(".platform-pillars__heading")) return
        gsap.from(element, {
          autoAlpha: 0,
          y: 34,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 86%", once: true },
        })
      })

      gsap.utils.toArray(".landing-page [data-reveal-group]").forEach((group) => {
        gsap.from(Array.from(group.children), {
          autoAlpha: 0,
          y: 28,
          duration: 0.8,
          stagger: Number(group.dataset.revealStagger) || 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: group, start: "top 84%", once: true },
        })
      })

      gsap.utils.toArray(".landing-page [data-draw]").forEach((path) => {
        if (desktop && path.closest("[data-hero-stage]")) return
        if (typeof path.getTotalLength !== "function") return
        const length = path.getTotalLength()
        if (!length) return

        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: path,
              start: "top 74%",
              once: true,
            },
          },
        )
      })

      gsap.from(".landing-page .hero__copy > *", {
        autoAlpha: 0,
        y: 24,
        duration: 0.9,
        stagger: 0.09,
        delay: 0.12,
        ease: "power3.out",
      })
    })

    media.add(
      "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
      () => {
        const hero = document.querySelector(".landing-page [data-hero-stage]")
        const heroCopy = hero?.querySelector("[data-hero-copy]")
        const heroProduct = hero?.querySelector("[data-hero-product]")
        const heroSources = hero ? gsap.utils.toArray("[data-hero-morph-source]", hero) : []
        const heroCursors = hero ? gsap.utils.toArray(".hero-cursor", hero) : []
        const heroCue = hero?.querySelector(".hero__scroll-cue")
        const heroChart = hero?.querySelector("[data-draw]")
        const pillarsHeading = document.querySelector(".landing-page .platform-pillars__heading")

        if (hero && heroCopy && heroProduct) {
          const morphPairs = heroSources.map((source) => ({
            key: source.dataset.heroMorphSource,
            source,
            target: hero.querySelector(`[data-hero-morph-target="${source.dataset.heroMorphSource}"]`),
          })).filter((pair) => pair.target)
          const morphTargets = morphPairs.map((pair) => pair.target)
          let morphMeasurements = null

          const measureMorphPairs = () => {
            if (morphMeasurements) return morphMeasurements
            const frameRect = heroProduct.getBoundingClientRect()
            // Read untransformed centers even when refreshing halfway through a scrub.
            const sourceRects = morphPairs.map(({ source }) => {
              const rect = source.getBoundingClientRect()
              return {
                left: rect.left + rect.width / 2 - source.offsetWidth / 2 - Number(gsap.getProperty(source, "x")),
                top: rect.top + rect.height / 2 - source.offsetHeight / 2 - Number(gsap.getProperty(source, "y")),
                width: source.offsetWidth,
                height: source.offsetHeight,
              }
            })
            const targetRects = morphPairs.map(({ target }) => {
              const rect = target.getBoundingClientRect()
              return { left: rect.left, top: rect.top - Number(gsap.getProperty(heroProduct, "y")), width: rect.width, height: rect.height }
            })
            const targetTravelY = getHeroProductTravel(
              { top: window.innerHeight - 24, height: frameRect.height },
              { viewportHeight: window.innerHeight },
            )

            morphMeasurements = {
              targetTravelY,
              pairs: new Map(morphPairs.map(({ key }, index) => [
                key,
                getHeroMorphTransform(sourceRects[index], targetRects[index], targetTravelY),
              ])),
            }
            return morphMeasurements
          }

          const productTravelY = () => measureMorphPairs().targetTravelY

          gsap.set(hero.querySelector(".hero-fragments"), { zIndex: 6 })
          gsap.set(morphTargets, { autoAlpha: 0 })
          const heroTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.2,
              invalidateOnRefresh: true,
              onRefreshInit: () => { morphMeasurements = null },
            },
          })

          heroTimeline
            .to(heroCopy, { autoAlpha: 0, y: -96, ease: "none", duration: 0.24 }, 0.1)
            .to(heroCue, { autoAlpha: 0, y: 12, ease: "none", duration: 0.14 }, 0.06)
            .to(heroCursors, { autoAlpha: 0, scale: 0.9, ease: "power2.out", duration: 0.2 }, 0.12)
            .to(heroProduct, { y: productTravelY, ease: "power2.out", duration: 0.48 }, 0.16)

          morphPairs.forEach(({ key, source, target }, index) => {
            const measured = (property) => () => measureMorphPairs().pairs.get(key)[property]
            const start = 0.34 + index * 0.025

            heroTimeline
              .to(source, {
                x: measured("x"),
                y: measured("y"),
                scale: measured("scale"),
                transformOrigin: "center center",
                ease: "power2.inOut",
                duration: 0.3,
              }, start)
              .to(target, { autoAlpha: 1, ease: "none", duration: 0.12 }, start + 0.18)
              .to(source, { autoAlpha: 0, ease: "none", duration: 0.12 }, start + 0.18)
          })

          if (heroChart) {
            const length = heroChart.getTotalLength()
            heroTimeline.fromTo(heroChart,
              { strokeDasharray: length, strokeDashoffset: length },
              { strokeDashoffset: 0, ease: "none", duration: 0.2 }, 0.64)
          }
          // A short reading beat, then native sticky release carries the dashboard up.
          heroTimeline.to({}, { duration: 0.16 }, 0.84)
          if (pillarsHeading) {
            gsap.from(pillarsHeading, {
              autoAlpha: 0, y: 36, ease: "none",
              scrollTrigger: {
                trigger: pillarsHeading, start: "top 96%", end: "top 72%", scrub: 0.2,
              },
            })
          }
        }

      },
    )

    if (progressRef.current) {
      utilityTriggers.push(
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => gsap.set(progressRef.current, { scaleX: self.progress }),
        }),
      )
    }

    utilityTriggers.push(
      ScrollTrigger.create({
        start: () => window.innerHeight * 0.9,
        end: "max",
        onToggle: (self) => setShowMobileCta(self.isActive),
      }),
    )

    const refreshAfterFonts = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refreshAfterFonts)
    window.addEventListener("load", refreshAfterFonts)

    return () => {
      window.removeEventListener("load", refreshAfterFonts)
      media.revert()
      utilityTriggers.forEach((trigger) => trigger.kill())
    }
  })

  return (
    <>
      <div className="landing-progress" ref={progressRef} aria-hidden="true" />
      <a
        className={showMobileCta ? "mobile-cta mobile-cta--visible" : "mobile-cta"}
        href={ctaHref}
        tabIndex={showMobileCta ? 0 : -1}
      >
        Buka Artami
      </a>
    </>
  )
}
