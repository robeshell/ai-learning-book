from manim import *

class TestScene(Scene):
    def construct(self):
        self.camera.background_color = "#0F172A"
        title = Text("大模型硬件账本：显存与带宽", font="PingFang SC", font_size=36, color="#38BDF8")
        circle = Circle(radius=1.5, color="#818CF8", fill_opacity=0.3)
        
        self.play(FadeIn(title, shift=UP*0.5))
        self.play(Create(circle))
        self.wait(1)

