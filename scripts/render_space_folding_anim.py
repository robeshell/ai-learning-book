import os
from manim import *

BG_COLOR = "#0f172a"
TEXT_COLOR = "#f8fafc"
GRID_COLOR = "#334155"

class SpaceFoldingScene(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # 1. Title
        title = Text("非线性激活：打破线性限制的空间折叠", font_size=28, weight=BOLD, color=TEXT_COLOR)
        title.to_edge(UP, buff=0.4)
        subtitle = Text("单层线性无法切分异或（XOR）数据 ➔ 激活函数赋予多维空间弯折切分能力", font_size=15, color="#94a3b8")
        subtitle.next_to(title, DOWN, buff=0.15)

        self.play(FadeIn(title, shift=UP*0.3), FadeIn(subtitle, shift=UP*0.3), run_time=1.0)
        self.wait(0.5)

        # 2. Setup 2D Plane
        plane = NumberPlane(
            x_range=[-2, 3, 1],
            y_range=[-2, 3, 1],
            background_line_style={
                "stroke_color": GRID_COLOR,
                "stroke_width": 1.5,
                "stroke_opacity": 0.6
            },
            axis_config={
                "stroke_color": "#64748b",
                "stroke_width": 2,
            }
        ).scale(0.85).shift(DOWN * 0.4)

        # 4 XOR Data Points
        # Red points (Class 1): (0, 1), (1, 0)
        # Blue points (Class 0): (0, 0), (1, 1)
        pt_00 = Dot(plane.c2p(0, 0), color="#3b82f6", radius=0.12)
        lbl_00 = Text("(0, 0)", font_size=13, color="#93c5fd").next_to(pt_00, DL, buff=0.1)

        pt_11 = Dot(plane.c2p(1, 1), color="#3b82f6", radius=0.12)
        lbl_11 = Text("(1, 1)", font_size=13, color="#93c5fd").next_to(pt_11, UR, buff=0.1)

        pt_01 = Dot(plane.c2p(0, 1), color="#ef4444", radius=0.12)
        lbl_01 = Text("(0, 1)", font_size=13, color="#fca5a5").next_to(pt_01, UL, buff=0.1)

        pt_10 = Dot(plane.c2p(1, 0), color="#ef4444", radius=0.12)
        lbl_10 = Text("(1, 0)", font_size=13, color="#fca5a5").next_to(pt_10, DR, buff=0.1)

        self.play(
            Create(plane, lag_ratio=0.05),
            FadeIn(Group(pt_00, lbl_00, pt_11, lbl_11, pt_01, lbl_01, pt_10, lbl_10)),
            run_time=1.5
        )
        self.wait(0.5)

        # 3. Show Linear Boundary Failure
        linear_line = Line(plane.c2p(-1.5, 2.0), plane.c2p(2.5, -0.5), color="#f59e0b", stroke_width=3)
        linear_label = Text("尝试单一线性切分面 (失败：无法完全分离)", font_size=15, color="#f59e0b").to_corner(UL, buff=0.6).shift(DOWN*0.6)

        self.play(Create(linear_line), FadeIn(linear_label), run_time=1.5)
        self.wait(1.0)
        self.play(Uncreate(linear_line), FadeOut(linear_label), run_time=0.8)

        # 4. Apply Non-linear Folding & Transformation
        # Hidden layer transformation: h1 = ReLU(x1 + x2 - 0.5), h2 = ReLU(x1 + x2 - 1.5)
        # Point destinations in new coordinate space:
        # (0,0) -> (0, 0)
        # (0,1) -> (0.5, 0)
        # (1,0) -> (0.5, 0)
        # (1,1) -> (1.5, 0.5)
        fold_text = Text("经多层神经元激活（ReLU 空间折叠）", font_size=16, color="#10b981").to_corner(UL, buff=0.6).shift(DOWN*0.6)

        t_pt_00 = plane.c2p(0, 0)
        t_pt_01 = plane.c2p(1.2, 0)
        t_pt_10 = plane.c2p(1.2, 0)
        t_pt_11 = plane.c2p(2.2, 1.5)

        # Non-linear folding matrix/warp
        self.play(
            FadeIn(fold_text),
            plane.animate.apply_function(lambda p: np.array([
                p[0] + 0.3 * np.maximum(0, p[1]),
                p[1]**2 * 0.4 + 0.2 * p[0],
                p[2]
            ])),
            pt_00.animate.move_to(t_pt_00),
            lbl_00.animate.next_to(t_pt_00, DL, buff=0.1),
            pt_01.animate.move_to(t_pt_01),
            lbl_01.animate.next_to(t_pt_01, UP, buff=0.1),
            pt_10.animate.move_to(t_pt_10),
            lbl_10.animate.next_to(t_pt_10, DOWN, buff=0.1),
            pt_11.animate.move_to(t_pt_11),
            lbl_11.animate.next_to(t_pt_11, UR, buff=0.1),
            run_time=3.0
        )
        self.wait(1.0)

        # 5. Perfect Linear Separation in Folded Space
        sep_line = Line(plane.c2p(-0.5, 0.8), plane.c2p(2.5, 0.8), color="#10b981", stroke_width=4)
        sep_label = Text("折叠后：红点重合合并，一条直线完美切分！", font_size=15, color="#10b981").next_to(fold_text, DOWN, buff=0.2)

        self.play(Create(sep_line), FadeIn(sep_label), run_time=1.5)
        self.wait(2.0)

        # Final Fade
        self.play(
            FadeOut(Group(plane, pt_00, lbl_00, pt_11, lbl_11, pt_01, lbl_01, pt_10, lbl_10, fold_text, sep_line, sep_label, title, subtitle)),
            run_time=1.0
        )
