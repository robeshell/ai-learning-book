from manim import *

class MemoryBandwidthWall(Scene):
    def construct(self):
        # 1. 颜色与风格定义 (Dark Theme / 3B1B Style)
        self.camera.background_color = "#0B0F19"

        COLOR_BG_CARD = "#151E32"
        COLOR_BORDER = "#2D3748"
        COLOR_CYAN = "#38BDF8"
        COLOR_INDIGO = "#818CF8"
        COLOR_PURPLE = "#A855F7"
        COLOR_EMERALD = "#34D399"
        COLOR_AMBER = "#F59E0B"
        COLOR_ROSE = "#FB7185"
        COLOR_TEXT_MUTED = "#94A3B8"
        FONT_FAMILY = "PingFang SC"

        # 2. 标题区
        title = Text("显存带宽墙：大模型为什么逐字生成慢？", font=FONT_FAMILY, font_size=28, weight=BOLD, color=WHITE)
        title.to_edge(UP, buff=0.35)

        subtitle = Text("自回归生成 (Autoregressive) 的物理搬运瓶颈", font=FONT_FAMILY, font_size=15, color=COLOR_CYAN)
        subtitle.next_to(title, DOWN, buff=0.12)

        self.play(FadeIn(title, shift=UP*0.3), FadeIn(subtitle, shift=UP*0.2), run_time=0.8)

        # 3. 左右拓扑架构卡片
        # 左侧：HBM 显存仓库 (140GB)
        hbm_box = RoundedRectangle(corner_radius=0.15, width=3.4, height=3.8, fill_color=COLOR_BG_CARD, fill_opacity=0.9, stroke_color=COLOR_BORDER, stroke_width=2)
        hbm_box.move_to(LEFT * 4.2 + DOWN * 0.4)

        hbm_title = Text("HBM 显存仓库", font=FONT_FAMILY, font_size=16, weight=BOLD, color=COLOR_CYAN)
        hbm_title.next_to(hbm_box.get_top(), DOWN, buff=0.25)
        hbm_sub = Text("70B 模型权重: 140 GB", font=FONT_FAMILY, font_size=12, color=COLOR_TEXT_MUTED)
        hbm_sub.next_to(hbm_title, DOWN, buff=0.1)

        # 权重切片网格 (4x3 矩阵小方块表示 140GB 权重堆叠)
        weight_blocks = VGroup()
        for r in range(3):
            for c in range(4):
                block = RoundedRectangle(corner_radius=0.06, width=0.62, height=0.52, fill_color=COLOR_INDIGO, fill_opacity=0.35, stroke_color=COLOR_CYAN, stroke_width=1.5)
                block.move_to(hbm_box.get_center() + DOWN * 0.4 + RIGHT * ((c - 1.5) * 0.72) + UP * ((1 - r) * 0.65))
                weight_blocks.add(block)

        # 右侧：Tensor Core 计算核心
        core_box = RoundedRectangle(corner_radius=0.15, width=3.4, height=3.8, fill_color=COLOR_BG_CARD, fill_opacity=0.9, stroke_color=COLOR_BORDER, stroke_width=2)
        core_box.move_to(RIGHT * 4.2 + DOWN * 0.4)

        core_title = Text("Tensor Core 计算车间", font=FONT_FAMILY, font_size=16, weight=BOLD, color=COLOR_PURPLE)
        core_title.next_to(core_box.get_top(), DOWN, buff=0.25)
        core_sub = Text("算力极高 (数百万亿次/秒)", font=FONT_FAMILY, font_size=12, color=COLOR_TEXT_MUTED)
        core_sub.next_to(core_title, DOWN, buff=0.1)

        # 计算核心内部结构 (算力单元阵列)
        core_grid = VGroup()
        for r in range(2):
            for c in range(2):
                c_unit = RoundedRectangle(corner_radius=0.08, width=1.3, height=0.85, fill_color=COLOR_PURPLE, fill_opacity=0.25, stroke_color=COLOR_PURPLE, stroke_width=1.5)
                c_unit.move_to(core_box.get_center() + DOWN * 0.4 + RIGHT * ((c - 0.5) * 1.45) + UP * ((0.5 - r) * 1.0))
                c_label = Text("Matrix Unit", font=FONT_FAMILY, font_size=11, color=COLOR_PURPLE)
                c_label.move_to(c_unit.get_center())
                core_grid.add(VGroup(c_unit, c_label))

        # 中间：显存总线管道 (Memory Bus)
        bus_line_top = Line(LEFT * 2.3 + DOWN * 0.1, RIGHT * 2.3 + DOWN * 0.1, color=COLOR_BORDER, stroke_width=2)
        bus_line_bottom = Line(LEFT * 2.3 + DOWN * 0.9, RIGHT * 2.3 + DOWN * 0.9, color=COLOR_BORDER, stroke_width=2)
        bus_label = Text("显存总线 (Memory Bus)", font=FONT_FAMILY, font_size=13, weight=BOLD, color=COLOR_AMBER)
        bus_label.move_to(UP * 0.2 + DOWN * 0.15)
        bus_speed = Text("带宽: 2000 GB/s (2 TB/s)", font=FONT_FAMILY, font_size=11, color=COLOR_TEXT_MUTED)
        bus_speed.next_to(bus_label, DOWN, buff=0.08)

        bus_group = VGroup(bus_line_top, bus_line_bottom, bus_label, bus_speed)

        # 整体卡片入场
        self.play(
            FadeIn(hbm_box), FadeIn(hbm_title), FadeIn(hbm_sub), Create(weight_blocks, lag_ratio=0.03),
            FadeIn(core_box), FadeIn(core_title), FadeIn(core_sub), Create(core_grid, lag_ratio=0.05),
            FadeIn(bus_group),
            run_time=1.2
        )
        self.wait(0.5)

        # 4. 底部动态状态与吐字展示区
        status_bar = RoundedRectangle(corner_radius=0.1, width=11.8, height=1.3, fill_color=COLOR_BG_CARD, fill_opacity=0.95, stroke_color=COLOR_BORDER, stroke_width=1.5)
        status_bar.to_edge(DOWN, buff=0.25)

        status_title = Text("当前状态：准备生成...", font=FONT_FAMILY, font_size=14, color=COLOR_AMBER)
        status_title.move_to(status_bar.get_left() + RIGHT * 1.6 + UP * 0.25)

        seq_label = Text("已生成序列：[ 什么是 ]", font=FONT_FAMILY, font_size=13, color=WHITE)
        seq_label.move_to(status_bar.get_left() + RIGHT * 1.6 + DOWN * 0.25)

        # 右侧计时对比仪
        timing_box = VGroup()
        fetch_time_txt = Text("搬运耗时: 70 ms (93%)", font=FONT_FAMILY, font_size=12, color=COLOR_ROSE)
        calc_time_txt = Text("计算耗时:  5 ms  (7%)", font=FONT_FAMILY, font_size=12, color=COLOR_EMERALD)
        fetch_time_txt.move_to(status_bar.get_right() + LEFT * 2.4 + UP * 0.25)
        calc_time_txt.move_to(status_bar.get_right() + LEFT * 2.4 + DOWN * 0.25)
        timing_box.add(fetch_time_txt, calc_time_txt)

        self.play(FadeIn(status_bar), FadeIn(status_title), FadeIn(seq_label), FadeIn(timing_box), run_time=0.6)
        self.wait(0.4)

        # 5. 循环演示自回归两轮吐字

        # --- 第 1 轮：生成 Token 1「大」---
        status_1 = Text("生成 Token 1: 正在从显存搬运全量 140GB 权重...", font=FONT_FAMILY, font_size=13, color=COLOR_ROSE)
        status_1.move_to(status_title.get_center())
        self.play(Transform(status_title, status_1), run_time=0.4)

        # 权重搬运光波 (从 HBM 穿过总线飞入 Core)
        packets_1 = VGroup(*[
            Dot(point=LEFT * 2.5 + DOWN * (0.3 + 0.15*i), radius=0.08, color=COLOR_CYAN)
            for i in range(4)
        ])

        # 激活权重块高亮流动
        self.play(
            weight_blocks.animate.set_fill(COLOR_CYAN, opacity=0.8),
            run_time=0.4
        )

        # 数据流快速穿过总线
        self.play(
            AnimationGroup(*[
                packets_1[i].animate.move_to(RIGHT * 2.6 + DOWN * (0.3 + 0.15*i))
                for i in range(4)
            ], lag_ratio=0.1),
            run_time=1.0
        )
        self.remove(packets_1)

        # 计算核心瞬间闪烁 (矩阵乘加完成)
        flash_core = RoundedRectangle(corner_radius=0.15, width=3.4, height=3.8, fill_color=COLOR_PURPLE, fill_opacity=0.4, stroke_color=COLOR_PURPLE, stroke_width=3)
        flash_core.move_to(core_box.get_center())

        status_calc1 = Text("计算核心闪算 (5ms) -> 吐出新 Token", font=FONT_FAMILY, font_size=13, color=COLOR_EMERALD)
        status_calc1.move_to(status_title.get_center())

        token_1 = Text("「大」", font=FONT_FAMILY, font_size=18, weight=BOLD, color=COLOR_EMERALD)
        token_1.next_to(core_box.get_right(), LEFT, buff=0.4)

        self.play(
            Transform(status_title, status_calc1),
            FadeIn(flash_core, run_time=0.15),
            weight_blocks.animate.set_fill(COLOR_INDIGO, opacity=0.35),
            run_time=0.3
        )
        self.play(
            FadeOut(flash_core, run_time=0.2),
            FadeIn(token_1, shift=UP*0.2),
            run_time=0.4
        )

        # 将新 Token 写入上下文
        seq_1 = Text("已生成序列：[ 什么是 大 ]", font=FONT_FAMILY, font_size=13, color=WHITE)
        seq_1.move_to(seq_label.get_center())
        self.play(
            token_1.animate.scale(0.7).move_to(seq_label.get_right() + RIGHT*0.4),
            Transform(seq_label, seq_1),
            run_time=0.6
        )
        self.remove(token_1)
        self.wait(0.5)

        # --- 第 2 轮：生成 Token 2「模」的自回归物理真相 (The Bottleneck) ---
        status_2 = Text("生成 Token 2: 算力清空，必须重新搬运整整 140GB！", font=FONT_FAMILY, font_size=13, weight=BOLD, color=COLOR_AMBER)
        status_2.move_to(status_title.get_center())
        self.play(Transform(status_title, status_2), run_time=0.5)

        # 再次全量搬运
        packets_2 = VGroup(*[
            Dot(point=LEFT * 2.5 + DOWN * (0.3 + 0.15*i), radius=0.08, color=COLOR_AMBER)
            for i in range(4)
        ])

        self.play(
            weight_blocks.animate.set_fill(COLOR_AMBER, opacity=0.8),
            run_time=0.4
        )
        self.play(
            AnimationGroup(*[
                packets_2[i].animate.move_to(RIGHT * 2.6 + DOWN * (0.3 + 0.15*i))
                for i in range(4)
            ], lag_ratio=0.1),
            run_time=1.0
        )
        self.remove(packets_2)

        # 计算完成并吐出「模」
        token_2 = Text("「模」", font=FONT_FAMILY, font_size=18, weight=BOLD, color=COLOR_EMERALD)
        token_2.next_to(core_box.get_right(), LEFT, buff=0.4)

        self.play(
            FadeIn(flash_core, run_time=0.15),
            weight_blocks.animate.set_fill(COLOR_INDIGO, opacity=0.35),
            run_time=0.3
        )
        self.play(
            FadeOut(flash_core, run_time=0.2),
            FadeIn(token_2, shift=UP*0.2),
            run_time=0.4
        )

        seq_2 = Text("已生成序列：[ 什么是 大 模 ]", font=FONT_FAMILY, font_size=13, color=WHITE)
        seq_2.move_to(seq_label.get_center())
        self.play(
            token_2.animate.scale(0.7).move_to(seq_label.get_right() + RIGHT*0.4),
            Transform(seq_label, seq_2),
            run_time=0.6
        )
        self.remove(token_2)
        self.wait(0.5)

        # 6. 核心物理公式与顿悟总结 (Insight Banner)
        insight_bg = RoundedRectangle(corner_radius=0.18, width=8.6, height=2.2, fill_color="#0F172A", fill_opacity=0.98, stroke_color=COLOR_CYAN, stroke_width=2.5)
        insight_bg.move_to(DOWN * 0.4)

        f_title = Text("物理法则：显存带宽受限 (Memory-Bound)", font=FONT_FAMILY, font_size=16, weight=BOLD, color=COLOR_CYAN)
        f_title.next_to(insight_bg.get_top(), DOWN, buff=0.25)

        f_math = Text("吐字速度上限 = 显存带宽 (2000 GB/s) ÷ 权重体积 (140 GB) ≈ 14.3 字/秒", font=FONT_FAMILY, font_size=13, weight=BOLD, color=WHITE)
        f_math.next_to(f_title, DOWN, buff=0.18)

        f_desc = Text("计算核心 90% 以上时间在干等数据搬运，这正是推测采样与 MoE 的破局切口！", font=FONT_FAMILY, font_size=12, color=COLOR_AMBER)
        f_desc.next_to(f_math, DOWN, buff=0.18)

        insight_group = VGroup(insight_bg, f_title, f_math, f_desc)

        self.play(
            FadeIn(insight_bg, scale=0.9),
            FadeIn(f_title, shift=UP*0.2),
            FadeIn(f_math, shift=UP*0.2),
            FadeIn(f_desc, shift=UP*0.2),
            run_time=0.9
        )
        self.wait(2.0)
