import os
from manim import *

BG_COLOR = "#0f172a"
TEXT_COLOR = "#f8fafc"
GRID_COLOR = "#334155"

class GradientDescentScene(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # 1. Title
        title = Text("损失曲面与梯度下降：寻找最优参数解", font_size=28, weight=BOLD, color=TEXT_COLOR)
        title.to_edge(UP, buff=0.4)
        subtitle = Text("W_new = W_old - η · ∇L：学习率步长与动量优化轨迹模拟", font_size=15, color="#94a3b8")
        subtitle.next_to(title, DOWN, buff=0.15)

        self.play(FadeIn(title, shift=UP*0.3), FadeIn(subtitle, shift=UP*0.3), run_time=1.0)
        self.wait(0.5)

        # 2. Setup Coordinate Axes & Loss Curve
        axes = Axes(
            x_range=[-3.5, 3.5, 1],
            y_range=[0, 7, 2],
            x_length=8,
            y_length=4.5,
            axis_config={"color": "#64748b", "stroke_width": 2},
        ).shift(DOWN * 0.4)

        # Loss function: L(w) = 0.5 * w^2 + 0.4 * cos(2*w) + 1.5
        loss_curve = axes.plot(
            lambda w: 0.5 * (w**2) + 0.3 * np.cos(2.5 * w) + 1.0,
            color="#38bdf8",
            stroke_width=3
        )
        curve_label = Text("损失函数曲面 L(W)", font_size=14, color="#38bdf8").next_to(axes.c2p(2.2, 5.0), UR, buff=0.1)

        self.play(
            Create(axes),
            Create(loss_curve),
            FadeIn(curve_label),
            run_time=1.5
        )
        self.wait(0.5)

        # 3. Demonstration 1: Learning Rate Too Large (Overshoot & Divergence)
        overshoot_title = Text("1. 学习率过大 (η 偏高) ➔ 震荡发散 (Loss Exploding)", font_size=16, color="#ef4444")
        overshoot_title.to_corner(UL, buff=0.6).shift(DOWN*0.6)

        start_w1 = -2.8
        ball1 = Dot(axes.c2p(start_w1, 0.5*(start_w1**2) + 0.3*np.cos(2.5*start_w1) + 1.0), color="#ef4444", radius=0.14)

        self.play(FadeIn(overshoot_title), FadeIn(ball1), run_time=0.8)

        # Steps jumping back and forth with increasing amplitude
        p1 = axes.c2p(2.5, 0.5*(2.5**2) + 0.3*np.cos(2.5*2.5) + 1.0)
        p2 = axes.c2p(-3.2, 0.5*(3.2**2) + 0.3*np.cos(2.5*(-3.2)) + 1.0)
        p3 = axes.c2p(3.5, 6.8)

        line1 = DashedLine(ball1.get_center(), p1, color="#fca5a5", stroke_width=2)
        line2 = DashedLine(p1, p2, color="#fca5a5", stroke_width=2)
        line3 = DashedLine(p2, p3, color="#fca5a5", stroke_width=2)

        self.play(Create(line1), ball1.animate.move_to(p1), run_time=0.8)
        self.play(Create(line2), ball1.animate.move_to(p2), run_time=0.8)
        self.play(Create(line3), ball1.animate.move_to(p3), run_time=0.8)
        self.wait(0.5)

        self.play(
            FadeOut(Group(overshoot_title, ball1, line1, line2, line3)),
            run_time=0.8
        )

        # 4. Demonstration 2: Optimal Descent with Momentum / AdamW (Smooth Convergence)
        optimal_title = Text("2. 合适学习率 + 动量 (AdamW) ➔ 平稳落入全局最优谷底", font_size=16, color="#10b981")
        optimal_title.to_corner(UL, buff=0.6).shift(DOWN*0.6)

        ball2 = Dot(axes.c2p(start_w1, 0.5*(start_w1**2) + 0.3*np.cos(2.5*start_w1) + 1.0), color="#10b981", radius=0.14)
        self.play(FadeIn(optimal_title), FadeIn(ball2), run_time=0.8)

        # Smooth steps down
        steps_w = [-2.0, -1.3, -0.7, -0.2, 0.0]
        descent_lines = []
        curr_pos = ball2.get_center()

        for next_w in steps_w:
            next_y = 0.5*(next_w**2) + 0.3*np.cos(2.5*next_w) + 1.0
            next_pos = axes.c2p(next_w, next_y)
            line = Line(curr_pos, next_pos, color="#86efac", stroke_width=2.5)
            descent_lines.append(line)
            self.play(Create(line), ball2.animate.move_to(next_pos), run_time=0.45)
            curr_pos = next_pos

        # Minimum label
        min_label = Text("★ 最优参数 W*", font_size=14, color="#10b981", weight=BOLD).next_to(ball2, DOWN, buff=0.15)
        self.play(FadeIn(min_label), run_time=0.6)
        self.wait(2.0)

        # Final Fade
        self.play(
            FadeOut(Group(axes, loss_curve, curve_label, optimal_title, ball2, min_label, *descent_lines, title, subtitle)),
            run_time=1.0
        )
