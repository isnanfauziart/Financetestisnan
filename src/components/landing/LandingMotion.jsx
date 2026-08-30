"use client"

import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function LandingMotion({ ctaHref = "/dashboard" }) {
  const progressRef = useRef(null)
  const [showMobileCta, setShowMobileCta] = useState(false)

  useGSAP(() => {
    const media = gsap.matchMedia()
    const extraTriggers = []

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray(".landing-page [data-reveal]").forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 28,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        })
      })

      gsap.utils.toArray(".landing-page [data-reveal-group]").forEach((group) => {
        const stagger = Number(group.dataset.revealStagger) || 0.08
        gsap.from(Array.from(group.children), {
          autoAlpha: 0,
          y: 24,
          duration: 0.7,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: group, start: "top 82%", once: true },
        })
      })

      gsap.utils.toArray(".landing-page [data-count-to]").forEach((el) => {
        const target = Number(el.dataset.countTo)
        if (!Number.isFinite(target) || target <= 0) return
        const state = { value: 0 }
        gsap.to(state, {
          value: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(state.value)}`
          },
        })
      })

      gsap.utils.toArray(".landing-page [data-bar]").forEach((bar) => {
        gsap.from(bar, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: bar, start: "top 92%", once: true },
        })
      })

      gsap.utils.toArray(".landing-page [data-draw]").forEach((path) => {
        if (typeof path.getTotalLength !== "function") return
        const length = path.getTotalLength()
        if (!length) return
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: path.closest("section") ?? path,
              start: "top 78%",
              once: true,
            },
          },
        )
      })

      gsap.utils.toArray(".landing-page .hero-float").forEach((float, index) => {
        gsap.to(float, {
          y: (index % 2 === 0 ? -1 : 1) * (42 + index * 12),
          ease: "none",
          scrollTrigger: {
            trigger: float.closest(".hero"),
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
      })
    })

    media.add(
      "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
      () => {
        gsap.utils.toArray(".landing-page .cta-evidence__item").forEach((item, index) => {
          gsap.fromTo(
            item,
            { y: 26 + index * 10 },
            {
              y: -26 - index * 8,
              ease: "none",
              scrollTrigger: {
                trigger: item.closest(".final-cta"),
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          )
        })
      },
    )

    if (progressRef.current) {
      extraTriggers.push(
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            gsap.set(progressRef.current, { scaleX: self.progress })
          },
        }),
      )
    }

    extraTriggers.push(
      ScrollTrigger.create({
        start: () => window.innerHeight * 0.85,
        end: "max",
        onToggle: (self) => setShowMobileCta(self.isActive),
      }),
    )

    return () => {
      media.revert()
      extraTriggers.forEach((trigger) => trigger.kill())
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