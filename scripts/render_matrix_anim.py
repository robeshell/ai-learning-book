import os
from manim import *

# Set color theme
BG_COLOR = "#0f172a"
TEXT_COLOR = "#f8fafc"
GRID_COLOR = "#334155"
I_HAT_COLOR = "#3b82f6"
J_HAT_COLOR = "#10b981"
VEC_COLOR = "#f59e0b"
PROJ_COLOR = "#a855f7"

class MatrixTransformationScene(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # 1. Title and Subtitle
        title = Text("矩阵变换：高维向量空间的空间形变与投影", font_size=28, weight=BOLD, color=TEXT_COLOR)
        title.to_edge(UP, buff=0.4)
        subtitle = Text("y = Wx：基底变换、网格拉伸与信息视角切换", font_size=16, color="#94a3b8")
        subtitle.next_to(title, DOWN, buff=0.15)

        self.play(FadeIn(title, shift=UP*0.3), FadeIn(subtitle, shift=UP*0.3), run_time=1.0)
        self.wait(0.5)

        # 2. Setup 2D Plane & Grid
        plane = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-2.5, 2.5, 1],
            background_line_style={
                "stroke_color": GRID_COLOR,
                "stroke_width": 1.5,
                "stroke_opacity": 0.6
            },
            axis_config={
                "stroke_color": "#64748b",
                "stroke_width": 2,
            }
        ).scale(0.9).shift(DOWN * 0.4)

        # Basis vectors
        i_vec = Arrow(plane.c2p(0, 0), plane.c2p(1, 0), buff=0, color=I_HAT_COLOR, stroke_width=4)
        i_label = Text("i [1, 0]", font_size=16, color=I_HAT_COLOR).next_to(i_vec, DOWN, buff=0.1)

        j_vec = Arrow(plane.c2p(0, 0), plane.c2p(0, 1), buff=0, color=J_HAT_COLOR, stroke_width=4)
        j_label = Text("j [0, 1]", font_size=16, color=J_HAT_COLOR).next_to(j_vec, LEFT, buff=0.1)

        # Input sample vector v = [1.5, 1.0]
        v_vec = Arrow(plane.c2p(0, 0), plane.c2p(1.5, 1.0), buff=0, color=VEC_COLOR, stroke_width=5)
        v_label = Text("v [1.5, 1.0]", font_size=16, color=VEC_COLOR).next_to(v_vec.get_end(), UR, buff=0.1)

        # Formula HUD
        formula_box = RoundedRectangle(corner_radius=0.1, height=1.1, width=3.8, fill_color="#1e293b", fill_opacity=0.9, stroke_color="#475569")
        formula_box.to_corner(UL, buff=0.6).shift(DOWN*0.5)

        matrix_title = Text("权重矩阵 W", font_size=14, color="#94a3b8", weight=BOLD).move_to(formula_box.get_top() + DOWN*0.2)
        matrix_val = Text("[ 1.4  -0.6 ]\n[ 0.4   1.2 ]", font_size=16, color="#38bdf8", font="IBM Plex Mono").move_to(formula_box.get_center() + DOWN*0.1)

        self.play(
            Create(plane, lag_ratio=0.05),
            GrowArrow(i_vec), FadeIn(i_label),
            GrowArrow(j_vec), FadeIn(j_label),
            GrowArrow(v_vec), FadeIn(v_label),
            FadeIn(formula_box), FadeIn(matrix_title), FadeIn(matrix_val),
            run_time=2.0
        )
        self.wait(1.0)

        # 3. Apply Linear Transformation W
        matrix = [[1.4, -0.6], [0.4, 1.2]]

        trans_i_target = plane.c2p(1.4, 0.4)
        trans_j_target = plane.c2p(-0.6, 1.2)
        trans_v_target = plane.c2p(1.4*1.5 + (-0.6)*1.0, 0.4*1.5 + 1.2*1.0) # [1.5, 1.8]

        expl_text = Text("矩阵相乘 ➔ 空间整体形变与旋转", font_size=16, color="#38bdf8")
        expl_text.next_to(formula_box, DOWN, buff=0.2)

        self.play(
            FadeIn(expl_text, shift=DOWN*0.2),
            plane.animate.apply_matrix(matrix),
            i_vec.animate.put_start_and_end_on(plane.c2p(0, 0), trans_i_target),
            i_label.animate.next_to(trans_i_target, DOWN, buff=0.1).set_color(I_HAT_COLOR),
            j_vec.animate.put_start_and_end_on(plane.c2p(0, 0), trans_j_target),
            j_label.animate.next_to(trans_j_target, LEFT, buff=0.1).set_color(J_HAT_COLOR),
            v_vec.animate.put_start_and_end_on(plane.c2p(0, 0), trans_v_target),
            v_label.animate.next_to(trans_v_target, UR, buff=0.1).set_color(VEC_COLOR),
            run_time=3.0
        )
        self.wait(1.5)

        # 4. Projection onto subspace (Linear Projection Perspective)
        proj_title = Text("线性投影：提取特定语义子空间分量", font_size=16, color="#c084fc")
        proj_title.move_to(expl_text.get_center())

        # Line of projection (e.g. 1D feature axis)
        proj_line = Line(plane.c2p(-3, -1), plane.c2p(3, 1), color="#a855f7", stroke_width=3)
        proj_label = Text("关注特征轴 (语义子空间)", font_size=13, color="#c084fc").next_to(proj_line.get_end(), RIGHT, buff=0.1)

        # Dropping perpendicular line
        proj_pt = plane.c2p(1.9, 0.63)
        drop_line = DashedLine(trans_v_target, proj_pt, color="#e2e8f0", stroke_width=2)
        proj_vec = Arrow(plane.c2p(0, 0), proj_pt, buff=0, color="#d8b4fe", stroke_width=5)
        proj_v_label = Text("v_proj (投影向量)", font_size=14, color="#d8b4fe").next_to(proj_pt, DR, buff=0.1)

        self.play(
            FadeOut(expl_text),
            FadeIn(proj_title),
            Create(proj_line),
            FadeIn(proj_label),
            run_time=1.5
        )
        self.play(
            Create(drop_line),
            GrowArrow(proj_vec),
            FadeIn(proj_v_label),
            run_time=2.0
        )
        self.wait(2.0)

        # Final Fade
        self.play(
            FadeOut(Group(plane, i_vec, j_vec, v_vec, i_label, j_label, v_label, formula_box, matrix_title, matrix_val, proj_title, proj_line, proj_label, drop_line, proj_vec, proj_v_label, title, subtitle)),
            run_time=1.0
        )
