import os
from manim import *

# Set dark color theme matching the site
BG_COLOR = "#0f172a"
TEXT_COLOR = "#f8fafc"
MUTED_COLOR = "#94a3b8"
Q_COLOR = "#38bdf8"      # Sky blue for Query
K_COLOR = "#34d399"      # Emerald green for Key
V_COLOR = "#fbbf24"      # Amber yellow for Value
OUT_COLOR = "#c084fc"    # Purple for Output
CARD_BG = "#1e293b"
BORDER_COLOR = "#334155"

class TransformerAttentionScene(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # 1. Header Title and Subtitle
        title = Text("Transformer 自注意力机制：QKV 动态语境路由", font_size=26, weight=BOLD, color=TEXT_COLOR)
        title.to_edge(UP, buff=0.4)
        subtitle = Text("基于例句 [苹果, 发布, 新手机] 的全词并发与向量加权聚合", font_size=15, color=MUTED_COLOR)
        subtitle.next_to(title, DOWN, buff=0.15)

        self.play(FadeIn(title, shift=UP*0.3), FadeIn(subtitle, shift=UP*0.3), run_time=1.0)
        self.wait(0.5)

        # 2. Input Tokens
        tokens_text = ["\"苹果\"", "\"发布\"", "\"新手机\""]
        token_boxes = []
        token_labels = []
        x_positions = [-3.5, 0.0, 3.5]

        for i, (txt, x_pos) in enumerate(zip(tokens_text, x_positions)):
            box = RoundedRectangle(corner_radius=0.1, height=0.9, width=2.4, fill_color=CARD_BG, fill_opacity=0.9, stroke_color=BORDER_COLOR, stroke_width=2)
            box.move_to(np.array([x_pos, 1.6, 0]))
            lbl = Text(txt, font_size=18, color=TEXT_COLOR, weight=BOLD).move_to(box.get_center())
            token_boxes.append(box)
            token_labels.append(lbl)

        tokens_group = VGroup(*token_boxes, *token_labels)
        self.play(Create(VGroup(*token_boxes)), Write(VGroup(*token_labels)), run_time=1.2)
        self.wait(0.6)

        # 3. Linear Projections into Q, K, V
        qkv_desc = Text("1. 线性投影派生：Query(诉求)、Key(特征标签)、Value(语义实体)", font_size=15, color="#38bdf8")
        qkv_desc.next_to(tokens_group, DOWN, buff=0.4)
        self.play(FadeIn(qkv_desc), run_time=0.8)

        q_boxes, k_boxes, v_boxes = [], [], []
        q_lbls, k_lbls, v_lbls = [], [], []

        for i, x_pos in enumerate(x_positions):
            # Query
            qb = RoundedRectangle(corner_radius=0.08, height=0.55, width=0.7, fill_color="#0369a1", fill_opacity=0.8, stroke_color=Q_COLOR)
            qb.move_to(np.array([x_pos - 0.75, 0.2, 0]))
            ql = Text(f"Q{i+1}", font_size=13, color=Q_COLOR, weight=BOLD).move_to(qb.get_center())
            q_boxes.append(qb); q_lbls.append(ql)

            # Key
            kb = RoundedRectangle(corner_radius=0.08, height=0.55, width=0.7, fill_color="#065f46", fill_opacity=0.8, stroke_color=K_COLOR)
            kb.move_to(np.array([x_pos, 0.2, 0]))
            kl = Text(f"K{i+1}", font_size=13, color=K_COLOR, weight=BOLD).move_to(kb.get_center())
            k_boxes.append(kb); k_lbls.append(kl)

            # Value
            vb = RoundedRectangle(corner_radius=0.08, height=0.55, width=0.7, fill_color="#78350f", fill_opacity=0.8, stroke_color=V_COLOR)
            vb.move_to(np.array([x_pos + 0.75, 0.2, 0]))
            vl = Text(f"V{i+1}", font_size=13, color=V_COLOR, weight=BOLD).move_to(vb.get_center())
            v_boxes.append(vb); v_lbls.append(vl)

        qkv_group = VGroup(*q_boxes, *q_lbls, *k_boxes, *k_lbls, *v_boxes, *v_lbls)
        self.play(FadeIn(qkv_group, shift=DOWN*0.3), run_time=1.2)
        self.wait(1.0)

        # 4. Dot Product Attention Routing from Q1 (Apple)
        self.play(FadeOut(qkv_desc))
        attn_desc = Text("2. 点积打分与 Softmax：Q_苹果 主动寻找上下文强关联词", font_size=15, color="#f59e0b")
        attn_desc.next_to(tokens_group, DOWN, buff=0.4)
        self.play(FadeIn(attn_desc), run_time=0.8)

        # Highlight Q1
        self.play(q_boxes[0].animate.scale(1.15).set_stroke(color="#ffffff", width=3), run_time=0.5)

        # Draw Attention Rays from Q1 to K1, K2, K3
        ray1 = Arrow(q_boxes[0].get_center(), k_boxes[0].get_center(), color=Q_COLOR, stroke_width=2.5, buff=0.1)
        ray2 = CurvedArrow(q_boxes[0].get_top(), k_boxes[1].get_top(), color=Q_COLOR, stroke_width=2.5, angle=-0.5)
        ray3 = CurvedArrow(q_boxes[0].get_top(), k_boxes[2].get_top(), color=Q_COLOR, stroke_width=4.0, angle=-0.6)

        # Attention weight tags
        w1_tag = Text("15%", font_size=12, color="#94a3b8", weight=BOLD).next_to(k_boxes[0], DOWN, buff=0.15)
        w2_tag = Text("10%", font_size=12, color="#94a3b8", weight=BOLD).next_to(k_boxes[1], DOWN, buff=0.15)
        w3_tag = Text("75% (科技企业)", font_size=13, color="#38bdf8", weight=BOLD).next_to(k_boxes[2], DOWN, buff=0.15)

        self.play(
            Create(ray1), Create(ray2), Create(ray3),
            FadeIn(w1_tag), FadeIn(w2_tag), FadeIn(w3_tag),
            run_time=2.0
        )
        self.wait(1.2)

        # 5. Weighted Sum of Values
        self.play(FadeOut(attn_desc))
        agg_desc = Text("3. Value 矩阵加权求和：Output = 0.15*V1 + 0.10*V2 + 0.75*V3", font_size=15, color=OUT_COLOR)
        agg_desc.next_to(tokens_group, DOWN, buff=0.4)
        self.play(FadeIn(agg_desc), run_time=0.8)

        # Output representation for Apple
        out_box = RoundedRectangle(corner_radius=0.12, height=0.85, width=3.8, fill_color="#581c87", fill_opacity=0.9, stroke_color=OUT_COLOR, stroke_width=2.5)
        out_box.move_to(np.array([-1.5, -1.9, 0]))
        out_title = Text("Z_苹果 = 科技公司语境向量", font_size=15, color="#f8fafc", weight=BOLD).move_to(out_box.get_center())

        v_agg1 = Arrow(v_boxes[0].get_bottom(), out_box.get_top(), color=V_COLOR, stroke_width=2, stroke_opacity=0.5)
        v_agg2 = Arrow(v_boxes[1].get_bottom(), out_box.get_top(), color=V_COLOR, stroke_width=2, stroke_opacity=0.5)
        v_agg3 = Arrow(v_boxes[2].get_bottom(), out_box.get_top(), color=V_COLOR, stroke_width=5)

        self.play(
            Create(v_agg1), Create(v_agg2), Create(v_agg3),
            FadeIn(out_box), Write(out_title),
            run_time=2.0
        )
        self.wait(2.0)

        # Final cleanup
        self.play(
            FadeOut(Group(
                title, subtitle, tokens_group, qkv_group, agg_desc,
                ray1, ray2, ray3, w1_tag, w2_tag, w3_tag,
                v_agg1, v_agg2, v_agg3, out_box, out_title
            )),
            run_time=1.0
        )
