"""
House style for everything the agents write.

Model prose drifts toward a register nobody actually uses: em dashes everywhere,
"leverage" instead of "use", "robust solution" instead of saying what it does. It
reads as machine-written, which undermines a tool whose whole claim is that its
output is grounded and specific.
"""

PLAIN_STYLE = (
    "Write plainly, the way a competent engineer writes to another. "
    "Never use an em dash. Use a comma, a full stop, or brackets instead. "
    "Do not use these words or anything like them: leverage, utilise, robust, seamless, "
    "cutting-edge, state-of-the-art, delve, elevate, unlock, empower, streamline, harness, "
    "spearhead, journey, landscape, realm, tapestry, holistic, comprehensive, game-changing, "
    "best-in-class, synergy, dive into, unleash, supercharge, revolutionise, transformative. "
    "No throat-clearing openers such as 'In today's fast-paced world' or 'It is worth noting that'. "
    "No praise for the reader and no cheerleading. "
    "Say the concrete thing: 'restarts the pod in 60 seconds', not 'ensures robust resilience'."
)
