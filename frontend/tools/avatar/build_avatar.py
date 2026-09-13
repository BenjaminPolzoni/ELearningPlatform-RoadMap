"""Construye el avatar low-poly modular y lo exporta como GLB.

Se ejecuta con Blender en modo background. Blender es una herramienta de autoría y no
forma parte de las dependencias de la aplicación.
"""

import math
import os
import sys

import bpy
from mathutils import Vector


OUTPUT_GLB = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../public/mundo-3d/Assets/Avatar/avatar-low-poly-approved.glb")
)
PREVIEW_PNG = os.path.join(os.environ.get("TEMP", os.path.dirname(OUTPUT_GLB)), "avatar-low-poly-approved-preview.png")


COLORS = {
    "skin": "#E8A06D",
    "skin_shadow": "#C97752",
    "hair": "#3B2926",
    "eyes": "#151515",
    "mouth": "#713621",
    "top": "#47709A",
    "top_dark": "#304E70",
    "pants": "#34353B",
    "pants_dark": "#25262B",
    "shoes": "#F1F1EF",
    "sole": "#8D9299",
    "white": "#F4F4F0",
    "black": "#202329",
    "blue": "#55A8F7",
    "cyan": "#49B8BA",
    "yellow": "#F3C742",
    "orange": "#E79842",
    "green": "#628976",
    "red": "#C95050",
}


def rgba(hex_color):
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def create_vertex_material():
    material = bpy.data.materials.new("AvatarAtlas")
    material.use_nodes = True
    material.diffuse_color = (1, 1, 1, 1)
    material.roughness = 0.82
    material.metallic = 0.0
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    vertex_color = nodes.new("ShaderNodeVertexColor")
    vertex_color.layer_name = "Col"
    shader.inputs["Roughness"].default_value = 0.82
    shader.inputs["Metallic"].default_value = 0.0
    links.new(vertex_color.outputs["Color"], shader.inputs["Base Color"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def make_empty(name, parent=None, variant=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if variant is not None:
        obj["variant"] = variant
    return obj


def set_vertex_color(mesh, color):
    layer = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="CORNER")
    value = rgba(color)
    for item in layer.data:
        if hasattr(item, "color_srgb"):
            item.color_srgb = value
        else:
            item.color = value


def mesh_object(name, vertices, faces, color, parent, material, color_slot=None, bone=None, armature=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    set_vertex_color(mesh, color)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if color_slot:
        obj["colorSlot"] = color_slot
    if bone and armature:
        modifier = obj.modifiers.new("SharedRig", "ARMATURE")
        modifier.object = armature
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(vertices))), 1.0, "REPLACE")
    return obj


def ellipsoid_geometry(center, radii, segments=14, rings=8, chin=0.0):
    cx, cy, cz = center
    rx, ry, rz = radii
    vertices = [(cx, cy, cz - rz)]
    for ring in range(1, rings):
        phi = -math.pi / 2 + math.pi * ring / rings
        cp = math.cos(phi)
        sp = math.sin(phi)
        taper = 1.0 - chin * max(0.0, -sp)
        for segment in range(segments):
            theta = 2 * math.pi * segment / segments
            vertices.append(
                (
                    cx + rx * cp * math.cos(theta) * taper,
                    cy + ry * cp * math.sin(theta),
                    cz + rz * sp,
                )
            )
    vertices.append((cx, cy, cz + rz))
    bottom = 0
    top = len(vertices) - 1
    faces = []
    for segment in range(segments):
        faces.append((bottom, 1 + (segment + 1) % segments, 1 + segment))
    for ring in range(rings - 2):
        start = 1 + ring * segments
        next_start = start + segments
        for segment in range(segments):
            a = start + segment
            b = start + (segment + 1) % segments
            c = next_start + (segment + 1) % segments
            d = next_start + segment
            if (ring + segment) % 2:
                faces.extend(((a, b, d), (b, c, d)))
            else:
                faces.extend(((a, b, c), (a, c, d)))
    last_ring = 1 + (rings - 2) * segments
    for segment in range(segments):
        faces.append((last_ring + segment, last_ring + (segment + 1) % segments, top))
    return vertices, faces


def ellipsoid(name, center, radii, color, parent, material, color_slot=None, bone=None, armature=None, segments=14, rings=8, chin=0.0):
    vertices, faces = ellipsoid_geometry(center, radii, segments, rings, chin)
    return mesh_object(name, vertices, faces, color, parent, material, color_slot, bone, armature)


def frustum_between_geometry(start, end, radius_start, radius_end, sides=8, squash=1.0):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = (end_v - start_v).normalized()
    reference = Vector((0, 0, 1)) if abs(direction.z) < 0.9 else Vector((0, 1, 0))
    axis_a = direction.cross(reference).normalized()
    axis_b = direction.cross(axis_a).normalized() * squash
    vertices = []
    for point, radius in ((start_v, radius_start), (end_v, radius_end)):
        for index in range(sides):
            angle = 2 * math.pi * index / sides
            offset = axis_a * (math.cos(angle) * radius) + axis_b * (math.sin(angle) * radius)
            vertices.append(tuple(point + offset))
    faces = []
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple(range(sides, sides * 2)))
    for index in range(sides):
        nxt = (index + 1) % sides
        faces.extend(((index, nxt, sides + nxt), (index, sides + nxt, sides + index)))
    return vertices, faces


def frustum(name, start, end, radius_start, radius_end, color, parent, material, color_slot=None, bone=None, armature=None, sides=8, squash=1.0):
    vertices, faces = frustum_between_geometry(start, end, radius_start, radius_end, sides, squash)
    return mesh_object(name, vertices, faces, color, parent, material, color_slot, bone, armature)


def segmented_limb(name, points, radii, color, parent, material, color_slot, bone, armature, sides=10, squash=0.86):
    direction = (Vector(points[-1]) - Vector(points[0])).normalized()
    reference = Vector((0, 0, 1)) if abs(direction.z) < 0.9 else Vector((0, 1, 0))
    axis_a = direction.cross(reference).normalized()
    axis_b = direction.cross(axis_a).normalized() * squash
    vertices = []
    for ring_index, (point, radius) in enumerate(zip(points, radii)):
        center = Vector(point)
        twist = (ring_index % 2) * math.pi / sides
        for index in range(sides):
            angle = 2 * math.pi * index / sides + twist
            offset = axis_a * (math.cos(angle) * radius) + axis_b * (math.sin(angle) * radius)
            vertices.append(tuple(center + offset))
    faces = [tuple(reversed(range(sides))), tuple(range((len(points) - 1) * sides, len(points) * sides))]
    for ring_index in range(len(points) - 1):
        start = ring_index * sides
        nxt_start = (ring_index + 1) * sides
        for index in range(sides):
            nxt = (index + 1) % sides
            faces.extend(((start + index, start + nxt, nxt_start + index), (start + nxt, nxt_start + nxt, nxt_start + index)))
    return mesh_object(name, vertices, faces, color, parent, material, color_slot, bone, armature)


def rounded_ring_points(width, depth):
    return [
        (-width * 0.62, -depth),
        (width * 0.62, -depth),
        (width, -depth * 0.45),
        (width, depth * 0.45),
        (width * 0.62, depth),
        (-width * 0.62, depth),
        (-width, depth * 0.45),
        (-width, -depth * 0.45),
    ]


def loft_geometry(levels):
    vertices = []
    for z, width, depth, y_offset in levels:
        vertices.extend((x, y + y_offset, z) for x, y in rounded_ring_points(width, depth))
    sides = 8
    faces = [tuple(reversed(range(sides))), tuple(range((len(levels) - 1) * sides, len(levels) * sides))]
    for level in range(len(levels) - 1):
        start = level * sides
        nxt_start = (level + 1) * sides
        for index in range(sides):
            nxt = (index + 1) % sides
            faces.extend(((start + index, start + nxt, nxt_start + nxt), (start + index, nxt_start + nxt, nxt_start + index)))
    return vertices, faces


def loft(name, levels, color, parent, material, color_slot=None, bone=None, armature=None):
    vertices, faces = loft_geometry(levels)
    return mesh_object(name, vertices, faces, color, parent, material, color_slot, bone, armature)


def prism_geometry(minimum, maximum):
    x0, y0, z0 = minimum
    x1, y1, z1 = maximum
    vertices = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = [
        (0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7),
        (0, 1, 5), (0, 5, 4), (1, 2, 6), (1, 6, 5),
        (2, 3, 7), (2, 7, 6), (3, 0, 4), (3, 4, 7),
    ]
    return vertices, faces


def prism(name, minimum, maximum, color, parent, material, color_slot=None, bone=None, armature=None):
    vertices, faces = prism_geometry(minimum, maximum)
    return mesh_object(name, vertices, faces, color, parent, material, color_slot, bone, armature)


def shoe_geometry(side, style="sneakers"):
    sign = -1 if side == "L" else 1
    center_x = sign * 0.135
    width = 0.088 if style != "high-top" else 0.094
    back_y, toe_y = 0.08, -0.22
    bottom, ankle, toe = 0.015, (0.22 if style == "high-top" else 0.15), 0.105
    vertices = [
        (center_x - width, back_y, bottom), (center_x + width, back_y, bottom),
        (center_x + width * 1.15, toe_y, bottom), (center_x - width * 1.15, toe_y, bottom),
        (center_x - width * 0.82, back_y, ankle), (center_x + width * 0.82, back_y, ankle),
        (center_x + width, toe_y, toe), (center_x - width, toe_y, toe),
        (center_x, toe_y - 0.025, toe * 0.65),
    ]
    faces = [
        (0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7),
        (0, 1, 5), (0, 5, 4), (1, 2, 6), (1, 6, 5),
        (2, 8, 6), (3, 7, 8), (3, 8, 2), (7, 6, 8),
        (3, 0, 4), (3, 4, 7),
    ]
    return vertices, faces


def create_armature(root):
    data = bpy.data.armatures.new("AvatarRig")
    rig = bpy.data.objects.new("Rig", data)
    bpy.context.collection.objects.link(rig)
    rig.parent = root
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name, head, tail, parent=None):
        item = data.edit_bones.new(name)
        item.head = head
        item.tail = tail
        if parent:
            item.parent = data.edit_bones[parent]
        return item

    bone("root", (0, 0, 0), (0, 0, 0.18))
    bone("hips", (0, 0, 0.82), (0, 0, 1.12), "root")
    bone("spine", (0, 0, 1.12), (0, 0, 1.38), "hips")
    bone("chest", (0, 0, 1.38), (0, 0, 1.51), "spine")
    bone("neck", (0, 0, 1.51), (0, 0, 1.57), "chest")
    bone("head", (0, 0, 1.57), (0, 0, 1.82), "neck")
    for side, sign in (("L", -1), ("R", 1)):
        bone(f"upper_arm.{side}", (sign * 0.23, 0, 1.46), (sign * 0.31, -0.005, 1.22), "chest")
        bone(f"lower_arm.{side}", (sign * 0.31, -0.005, 1.22), (sign * 0.29, -0.035, 1.00), f"upper_arm.{side}")
        bone(f"hand.{side}", (sign * 0.29, -0.035, 1.00), (sign * 0.29, -0.04, 0.91), f"lower_arm.{side}")
        bone(f"thigh.{side}", (sign * 0.105, 0, 1.08), (sign * 0.115, 0, 0.68), "hips")
        bone(f"shin.{side}", (sign * 0.115, 0, 0.68), (sign * 0.115, 0, 0.22), f"thigh.{side}")
        bone(f"foot.{side}", (sign * 0.115, 0, 0.22), (sign * 0.115, -0.17, 0.10), f"shin.{side}")

    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    return rig


def add_body_variant(slot, variant, rig, material, feminine=False):
    parent = make_empty(f"Body__{variant}", slot, variant)
    head_width = 0.205 if feminine else 0.215
    ellipsoid("Head", (0, -0.012, 1.69), (head_width, 0.178, 0.235), COLORS["skin"], parent, material, "skin", "head", rig, 24, 14, 0.18)
    ellipsoid("Ear.L", (-head_width, -0.005, 1.69), (0.038, 0.027, 0.06), COLORS["skin_shadow"], parent, material, "skin", "head", rig, 10, 7)
    ellipsoid("Ear.R", (head_width, -0.005, 1.69), (0.038, 0.027, 0.06), COLORS["skin_shadow"], parent, material, "skin", "head", rig, 10, 7)
    frustum("Neck", (0, 0, 1.50), (0, 0, 1.58), 0.062, 0.067, COLORS["skin"], parent, material, "skin", "neck", rig, 8)

    for side, sign in (("L", -1), ("R", 1)):
        frustum(f"Forearm.{side}", (sign * 0.31, -0.005, 1.25), (sign * 0.29, -0.035, 1.00), 0.052, 0.043, COLORS["skin"], parent, material, "skin", f"lower_arm.{side}", rig, 9, 0.88)
        ellipsoid(f"Hand.{side}", (sign * 0.29, -0.045, 0.955), (0.052, 0.04, 0.075), COLORS["skin"], parent, material, "skin", f"hand.{side}", rig, 12, 8, 0.10)
        frustum(f"Ankle.{side}", (sign * 0.115, 0, 0.18), (sign * 0.115, 0, 0.255), 0.043, 0.046, COLORS["skin"], parent, material, "skin", f"foot.{side}", rig, 8)

    eye_z = 1.715
    for side, sign in (("L", -1), ("R", 1)):
        ellipsoid(f"Eye.{side}", (sign * 0.077, -0.183, eye_z), (0.023, 0.010, 0.041), COLORS["eyes"], parent, material, None, "head", rig, 10, 7)
        vertices, faces = prism_geometry((sign * 0.116 - 0.04, -0.188, 1.765), (sign * 0.116 + 0.04, -0.176, 1.782))
        mesh_object(f"Brow.{side}", vertices, faces, COLORS["hair"], parent, material, "hair", "head", rig)

    mouth_vertices = [
        (-0.055, -0.191, 1.635), (-0.025, -0.199, 1.622), (0, -0.201, 1.618),
        (0.025, -0.199, 1.622), (0.055, -0.191, 1.635),
        (-0.052, -0.190, 1.643), (-0.023, -0.198, 1.631), (0, -0.200, 1.627),
        (0.023, -0.198, 1.631), (0.052, -0.190, 1.643),
    ]
    mouth_faces = []
    for index in range(4):
        mouth_faces.extend(((index, index + 1, index + 6), (index, index + 6, index + 5)))
    mesh_object("Mouth", mouth_vertices, mouth_faces, COLORS["mouth"], parent, material, None, "head", rig)


def hair_piece(name, center, radii, parent, material, rig, segments=10, rings=6):
    return ellipsoid(name, center, radii, COLORS["hair"], parent, material, "hair", "head", rig, segments, rings, 0.05)


def hair_fringe(name, center_x, top_z, tip_z, half_width, parent, material, rig):
    y_front, y_back = -0.193, -0.125
    vertices = [
        (center_x - half_width, y_front, top_z),
        (center_x + half_width, y_front, top_z),
        (center_x, y_front, tip_z),
        (center_x - half_width, y_back, top_z),
        (center_x + half_width, y_back, top_z),
        (center_x, y_back, tip_z),
    ]
    faces = [
        (0, 1, 2), (3, 5, 4),
        (0, 3, 4), (0, 4, 1),
        (1, 4, 5), (1, 5, 2),
        (2, 5, 3), (2, 3, 0),
    ]
    return mesh_object(name, vertices, faces, COLORS["hair"], parent, material, "hair", "head", rig)


def add_hair_variants(slot, rig, material):
    styles = ("a", "b", "c", "d", "e", "f")
    for style in styles:
        parent = make_empty(f"Hair__{style}", slot, style)
        hair_piece("HairCap", (0, 0.055, 1.79), (0.218, 0.185, 0.18), parent, material, rig, 20, 12)
        if style in ("a", "f"):
            for index, (x, z, sx) in enumerate(((-0.12, 1.835, 0.11), (-0.025, 1.875, 0.13), (0.09, 1.845, 0.11))):
                hair_piece(f"HairTuft{index}", (x, -0.13, z), (sx, 0.075, 0.09), parent, material, rig, 12, 8)
            hair_fringe("Fringe.L", -0.10, 1.84, 1.77, 0.075, parent, material, rig)
            hair_fringe("Fringe.C", 0.01, 1.865, 1.785, 0.082, parent, material, rig)
            hair_fringe("Fringe.R", 0.115, 1.835, 1.79, 0.065, parent, material, rig)
        elif style == "b":
            hair_piece("SideSweep", (-0.035, -0.145, 1.81), (0.18, 0.07, 0.10), parent, material, rig, 10, 6)
            hair_piece("SideLock", (-0.17, -0.13, 1.68), (0.055, 0.055, 0.15), parent, material, rig, 8, 6)
        elif style == "c":
            hair_piece("ShortTexture", (0, -0.13, 1.84), (0.15, 0.055, 0.07), parent, material, rig, 9, 5)
        elif style == "d":
            hair_piece("SideLock.L", (-0.17, -0.04, 1.65), (0.055, 0.07, 0.17), parent, material, rig, 8, 6)
            hair_piece("SideLock.R", (0.17, -0.04, 1.65), (0.055, 0.07, 0.17), parent, material, rig, 8, 6)
            hair_piece("Ponytail", (0, 0.22, 1.48), (0.11, 0.10, 0.18), parent, material, rig, 10, 7)
        elif style == "e":
            hair_piece("Bun", (0, 0.13, 1.96), (0.10, 0.09, 0.095), parent, material, rig, 10, 6)
        else:
            for index, x in enumerate((-0.14, -0.07, 0, 0.07, 0.14)):
                hair_piece(f"Texture{index}", (x, -0.105, 1.86 - abs(x) * 0.2), (0.055, 0.055, 0.065), parent, material, rig, 7, 5)


def add_top_base(parent, rig, material, kind):
    feminine = False
    levels = [(1.12, 0.205, 0.12, 0), (1.34, 0.205, 0.125, -0.005), (1.49, 0.235, 0.13, 0)]
    if kind in ("hoodie", "jacket", "credential"):
        levels = [(z, w + 0.018, d + 0.015, y) for z, w, d, y in levels]
    loft("TopBody", levels, COLORS["top"], parent, material, "top", "spine", rig)
    for side, sign in (("L", -1), ("R", 1)):
        frustum(f"Sleeve.{side}", (sign * 0.20, 0, 1.455), (sign * 0.30, -0.003, 1.275), 0.082, 0.064, COLORS["top"], parent, material, "top", f"upper_arm.{side}", rig, 9, 0.9)
    if kind in ("hoodie", "jacket", "credential"):
        # Hood as three connected low-poly masses behind the neck.
        hair_piece("HoodBack", (0, 0.105, 1.50), (0.19, 0.09, 0.13), parent, material, rig, 10, 6)
        parent.children[-1]["colorSlot"] = "top"
        for sign in (-1, 1):
            frustum(f"DrawString.{sign}", (sign * 0.045, -0.132, 1.48), (sign * 0.045, -0.14, 1.34), 0.008, 0.006, COLORS["white"], parent, material, None, "chest", rig, 6)
    if kind == "jacket":
        prism("JacketOpening", (-0.012, -0.146, 1.13), (0.012, -0.131, 1.48), COLORS["black"], parent, material, None, "spine", rig)
    if kind == "credential":
        prism("Credential", (0.07, -0.157, 1.27), (0.16, -0.139, 1.39), COLORS["white"], parent, material, None, "chest", rig)


def add_emblem(parent, rig, material, emblem):
    color = COLORS["black"]
    y0, y1 = -0.154, -0.142
    if emblem == "code":
        for index, (x0, z0, x1, z1) in enumerate(((-0.10, 1.30, -0.035, 1.36), (-0.10, 1.30, -0.035, 1.24), (0.10, 1.30, 0.035, 1.36), (0.10, 1.30, 0.035, 1.24), (-0.018, 1.235, (0.018), 1.365))):
            width = 0.012
            prism(f"CodeMark{index}", (min(x0, x1) - width, y0, min(z0, z1) - width), (max(x0, x1) + width, y1, max(z0, z1) + width), color, parent, material, None, "chest", rig)
    elif emblem == "braces":
        for sign in (-1, 1):
            prism(f"Brace{sign}", (sign * 0.07 - 0.015, y0, 1.255), (sign * 0.07 + 0.015, y1, 1.355), color, parent, material, None, "chest", rig)


def add_top_variants(slot, rig, material):
    for kind in ("tshirt", "code", "braces", "hoodie", "jacket", "credential"):
        parent = make_empty(f"Top__{kind}", slot, kind)
        add_top_base(parent, rig, material, kind)
        if kind in ("code", "braces"):
            add_emblem(parent, rig, material, kind)


def add_bottom_variants(slot, rig, material):
    for kind in ("jogger", "jeans", "cargo"):
        parent = make_empty(f"Bottom__{kind}", slot, kind)
        width = 0.205 if kind == "jogger" else 0.19
        loft("Waist", [(1.02, width, 0.12, 0), (1.13, width * 1.05, 0.125, 0)], COLORS["pants"], parent, material, "bottom", "hips", rig)
        for side, sign in (("L", -1), ("R", 1)):
            hip = sign * 0.105
            thigh_radius = 0.13 if kind == "jogger" else 0.115
            segmented_limb(f"Thigh.{side}", ((hip, 0, 1.08), (sign * 0.125, -0.008, 0.88), (sign * 0.14, 0, 0.67)), (thigh_radius, thigh_radius * 0.96, 0.105), COLORS["pants"], parent, material, "bottom", f"thigh.{side}", rig, 10, 0.84)
            segmented_limb(f"Shin.{side}", ((sign * 0.14, 0, 0.70), (sign * 0.145, 0.012, 0.46), (sign * 0.135, 0, 0.20)), (0.112, 0.098, 0.067), COLORS["pants"], parent, material, "bottom", f"shin.{side}", rig, 10, 0.86)
            if kind == "cargo":
                prism(f"CargoPocket.{side}", (sign * 0.115 - 0.065, -0.105, 0.64), (sign * 0.115 + 0.065, -0.077, 0.82), COLORS["pants_dark"], parent, material, "bottom", f"thigh.{side}", rig)


def add_shoe_variants(slot, rig, material):
    for kind in ("sneakers", "high-top", "slip-on"):
        parent = make_empty(f"Shoes__{kind}", slot, kind)
        for side in ("L", "R"):
            vertices, faces = shoe_geometry(side, kind)
            mesh_object(f"Shoe.{side}", vertices, faces, COLORS["shoes"], parent, material, "shoes", f"foot.{side}", rig)
            sign = -1 if side == "L" else 1
            prism(f"Sole.{side}", (sign * 0.135 - 0.105, -0.235, 0.01), (sign * 0.135 + 0.105, 0.09, 0.035), COLORS["sole"], parent, material, None, f"foot.{side}", rig)


def add_head_accessories(slot, rig, material):
    headphones = make_empty("HeadAccessory__headphones", slot, "headphones")
    cat_headphones = make_empty("HeadAccessory__cat-headphones", slot, "cat-headphones")
    for parent in (headphones, cat_headphones):
        for side, sign in (("L", -1), ("R", 1)):
            ellipsoid(f"EarCup.{side}", (sign * 0.225, 0, 1.72), (0.055, 0.045, 0.085), COLORS["black"], parent, material, None, "head", rig, 9, 6)
            ellipsoid(f"EarLight.{side}", (sign * 0.258, -0.015, 1.72), (0.012, 0.032, 0.045), COLORS["blue"], parent, material, None, "head", rig, 8, 5)
        # Low-poly head band.
        frustum("Band.L", (-0.225, 0, 1.76), (-0.145, 0.02, 1.91), 0.018, 0.018, COLORS["black"], parent, material, None, "head", rig, 6)
        frustum("Band.R", (0.225, 0, 1.76), (0.145, 0.02, 1.91), 0.018, 0.018, COLORS["black"], parent, material, None, "head", rig, 6)
        frustum("Band.Top", (-0.145, 0.02, 1.91), (0.145, 0.02, 1.91), 0.018, 0.018, COLORS["black"], parent, material, None, "head", rig, 6)
    for sign in (-1, 1):
        vertices = [(sign * 0.13, 0, 1.92), (sign * 0.20, 0, 2.06), (sign * 0.235, 0, 1.90), (sign * 0.13, -0.025, 1.92), (sign * 0.20, -0.025, 2.06), (sign * 0.235, -0.025, 1.90)]
        faces = [(0, 1, 2), (3, 5, 4), (0, 3, 4), (0, 4, 1), (1, 4, 5), (1, 5, 2), (2, 5, 3), (2, 3, 0)]
        mesh_object(f"CatEar.{sign}", vertices, faces, COLORS["black"], cat_headphones, material, None, "head", rig)

    cap = make_empty("HeadAccessory__cap", slot, "cap")
    ellipsoid("CapCrown", (0, -0.01, 1.87), (0.225, 0.18, 0.12), COLORS["top_dark"], cap, material, None, "head", rig, 12, 6)
    prism("CapBrim", (-0.15, -0.265, 1.82), (0.15, -0.12, 1.855), COLORS["top_dark"], cap, material, None, "head", rig)
    beanie = make_empty("HeadAccessory__beanie", slot, "beanie")
    ellipsoid("Beanie", (0, 0.01, 1.88), (0.225, 0.185, 0.16), COLORS["top_dark"], beanie, material, None, "head", rig, 12, 7)
    ellipsoid("BeaniePom", (0, 0.01, 2.035), (0.055, 0.05, 0.055), COLORS["top_dark"], beanie, material, None, "head", rig, 8, 5)


def add_face_accessories(slot, rig, material):
    glasses = make_empty("FaceAccessory__glasses", slot, "glasses")
    for side, sign in (("L", -1), ("R", 1)):
        # Frames are four slim bars around each eye.
        prism(f"FrameTop.{side}", (sign * 0.075 - 0.055, -0.208, 1.755), (sign * 0.075 + 0.055, -0.195, 1.77), COLORS["black"], glasses, material, None, "head", rig)
        prism(f"FrameBottom.{side}", (sign * 0.075 - 0.055, -0.208, 1.675), (sign * 0.075 + 0.055, -0.195, 1.69), COLORS["black"], glasses, material, None, "head", rig)
        prism(f"FrameOuter.{side}", (sign * 0.075 + sign * 0.045 - 0.01, -0.208, 1.685), (sign * 0.075 + sign * 0.045 + 0.01, -0.195, 1.76), COLORS["black"], glasses, material, None, "head", rig)
    prism("Bridge", (-0.025, -0.21, 1.716), (0.025, -0.195, 1.73), COLORS["black"], glasses, material, None, "head", rig)
    visor = make_empty("FaceAccessory__visor", slot, "visor")
    prism("VisorLens", (-0.165, -0.215, 1.68), (0.165, -0.195, 1.77), COLORS["blue"], visor, material, None, "head", rig)


def add_hand_accessories(slot, rig, material):
    coffee = make_empty("HandAccessory__coffee", slot, "coffee")
    frustum("CoffeeCup", (0.36, -0.04, 0.96), (0.36, -0.04, 1.10), 0.055, 0.065, COLORS["black"], coffee, material, None, "hand.R", rig, 9)
    prism("CoffeeLid", (0.29, -0.11, 1.095), (0.43, 0.03, 1.12), COLORS["pants_dark"], coffee, material, None, "hand.R", rig)
    mate = make_empty("HandAccessory__mate", slot, "mate")
    ellipsoid("Mate", (0.36, -0.04, 1.03), (0.065, 0.06, 0.085), "#8B4E2D", mate, material, None, "hand.R", rig, 9, 6)
    frustum("Bombilla", (0.36, -0.04, 1.08), (0.39, -0.05, 1.23), 0.007, 0.006, COLORS["sole"], mate, material, None, "hand.R", rig, 6)
    energy = make_empty("HandAccessory__energy", slot, "energy")
    frustum("EnergyCan", (0.36, -0.04, 0.96), (0.36, -0.04, 1.12), 0.04, 0.04, COLORS["blue"], energy, material, None, "hand.R", rig, 10)
    phone = make_empty("HandAccessory__phone", slot, "phone")
    prism("Phone", (0.315, -0.095, 0.96), (0.405, -0.065, 1.13), COLORS["black"], phone, material, None, "hand.R", rig)
    prism("PhoneScreen", (0.325, -0.101, 0.98), (0.395, -0.094, 1.105), COLORS["blue"], phone, material, None, "hand.R", rig)
    laptop = make_empty("HandAccessory__laptop", slot, "laptop")
    prism("ClosedLaptop", (0.20, -0.12, 0.92), (0.47, -0.05, 1.10), COLORS["pants_dark"], laptop, material, None, "hand.R", rig)


def add_back_accessories(slot, rig, material):
    for kind in ("backpack", "tech-backpack", "sticker-backpack"):
        parent = make_empty(f"BackAccessory__{kind}", slot, kind)
        loft("Backpack", [(1.08, 0.20, 0.12, 0.13), (1.43, 0.22, 0.14, 0.135), (1.51, 0.17, 0.11, 0.12)], COLORS["pants_dark"], parent, material, None, "spine", rig)
        if kind != "backpack":
            prism("TechPanel", (-0.12, 0.245, 1.20), (0.12, 0.267, 1.40), COLORS["blue"], parent, material, None, "spine", rig)
        if kind == "sticker-backpack":
            for index, (x, z, color) in enumerate(((-0.09, 1.32, COLORS["white"]), (0.06, 1.23, COLORS["yellow"]), (0.08, 1.39, COLORS["blue"]))):
                prism(f"Sticker{index}", (x - 0.03, 0.267, z - 0.025), (x + 0.03, 0.273, z + 0.025), color, parent, material, None, "spine", rig)
    keyboard = make_empty("BackAccessory__keyboard", slot, "keyboard")
    prism("Keyboard", (-0.25, 0.13, 1.15), (0.25, 0.19, 1.43), COLORS["black"], keyboard, material, None, "spine", rig)
    for row in range(3):
        for col in range(6):
            x = -0.19 + col * 0.075
            z = 1.20 + row * 0.075
            prism(f"Key{row}{col}", (x, 0.19, z), (x + 0.05, 0.205, z + 0.045), COLORS["white"] if (row + col) % 4 else COLORS["blue"], keyboard, material, None, "spine", rig)


def add_waist_accessories(slot, rig, material):
    mouse = make_empty("WaistAccessory__mouse", slot, "mouse")
    ellipsoid("Mouse", (0.245, -0.02, 1.02), (0.045, 0.055, 0.065), COLORS["white"], mouse, material, None, "hips", rig, 8, 5)
    usb = make_empty("WaistAccessory__usb", slot, "usb")
    prism("USB", (0.20, -0.03, 0.96), (0.25, 0.015, 1.06), COLORS["blue"], usb, material, None, "hips", rig)
    keychain = make_empty("WaistAccessory__keychain", slot, "keychain")
    for index in range(3):
        prism(f"Keycap{index}", (0.20 + index * 0.045, -0.06, 0.97 - index * 0.025), (0.235 + index * 0.045, -0.015, 1.01 - index * 0.025), COLORS["white"], keychain, material, None, "hips", rig)
    cables = make_empty("WaistAccessory__cables", slot, "cables")
    for index in range(3):
        ellipsoid(f"CableLoop{index}", (0.23, 0.0, 1.0 - index * 0.018), (0.065, 0.025, 0.08), COLORS["black"], cables, material, None, "hips", rig, 8, 5)


def add_shoulder_accessories(slot, rig, material):
    duck = make_empty("ShoulderAccessory__duck", slot, "duck")
    ellipsoid("DuckBody", (-0.28, -0.005, 1.52), (0.055, 0.045, 0.05), COLORS["yellow"], duck, material, None, "chest", rig, 8, 5)
    ellipsoid("DuckHead", (-0.28, -0.02, 1.59), (0.043, 0.038, 0.045), COLORS["yellow"], duck, material, None, "chest", rig, 8, 5)
    prism("DuckBeak", (-0.31, -0.072, 1.575), (-0.25, -0.04, 1.595), COLORS["orange"], duck, material, None, "chest", rig)
    robot = make_empty("ShoulderAccessory__robot", slot, "robot")
    prism("RobotBody", (-0.335, -0.045, 1.49), (-0.235, 0.035, 1.59), COLORS["sole"], robot, material, None, "chest", rig)
    prism("RobotFace", (-0.32, -0.052, 1.55), (-0.25, -0.044, 1.58), COLORS["blue"], robot, material, None, "chest", rig)
    cat = make_empty("ShoulderAccessory__cat", slot, "cat")
    ellipsoid("CatBody", (-0.28, 0.0, 1.52), (0.075, 0.055, 0.045), COLORS["white"], cat, material, None, "chest", rig, 9, 5)
    ellipsoid("CatHead", (-0.34, -0.025, 1.56), (0.045, 0.04, 0.045), COLORS["white"], cat, material, None, "chest", rig, 8, 5)


def add_details(slot, rig, material):
    pin = make_empty("Details__pin", slot, "pin")
    ellipsoid("Pin", (0.12, -0.154, 1.38), (0.026, 0.008, 0.026), COLORS["yellow"], pin, material, None, "chest", rig, 8, 5)
    watch = make_empty("Details__watch", slot, "watch")
    prism("Watch", (0.26, -0.075, 1.02), (0.325, 0.0, 1.075), COLORS["black"], watch, material, None, "lower_arm.R", rig)
    bracelets = make_empty("Details__bracelets", slot, "bracelets")
    for index, color in enumerate((COLORS["blue"], COLORS["yellow"], COLORS["red"])):
        frustum(f"Bracelet{index}", (-0.30, -0.03, 1.02 + index * 0.018), (-0.30, -0.03, 1.035 + index * 0.018), 0.055, 0.055, color, bracelets, material, None, "lower_arm.L", rig, 8)


def create_animations(rig):
    scene = bpy.context.scene
    scene.render.fps = 24
    bpy.context.view_layer.objects.active = rig

    def clear_pose():
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
            pose_bone.rotation_euler = (0, 0, 0)
            pose_bone.location = (0, 0, 0)

    def action(name, frames, poses):
        item = bpy.data.actions.new(name)
        rig.animation_data_create()
        rig.animation_data.action = item
        for frame in frames:
            clear_pose()
            for bone_name, transforms in poses.get(frame, {}).items():
                pose_bone = rig.pose.bones[bone_name]
                if "rotation" in transforms:
                    pose_bone.rotation_euler = transforms["rotation"]
                    pose_bone.keyframe_insert("rotation_euler", frame=frame, group=bone_name)
                if "location" in transforms:
                    pose_bone.location = transforms["location"]
                    pose_bone.keyframe_insert("location", frame=frame, group=bone_name)
            # Keys on untouched limbs keep action sampling deterministic.
            for pose_bone in rig.pose.bones:
                pose_bone.keyframe_insert("rotation_euler", frame=frame, group=pose_bone.name)
                pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
        item.frame_start = frames[0]
        item.frame_end = frames[-1]
        item.use_cyclic = True
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, frames[0], item)
        strip.action_frame_start = frames[0]
        strip.action_frame_end = frames[-1]
        strip.repeat = 1
        track.mute = True
        rig.animation_data.action = None

    action(
        "idle",
        (1, 20, 40),
        {
            1: {"hips": {"location": (0, 0, 0)}},
            20: {"hips": {"location": (0, 0, 0.012)}, "chest": {"rotation": (0, 0.015, 0)}},
            40: {"hips": {"location": (0, 0, 0)}},
        },
    )
    action(
        "walk",
        (1, 7, 13, 19, 25),
        {
            1: {"thigh.L": {"rotation": (0.48, 0, 0)}, "thigh.R": {"rotation": (-0.48, 0, 0)}, "upper_arm.L": {"rotation": (-0.30, 0, 0)}, "upper_arm.R": {"rotation": (0.30, 0, 0)}},
            7: {"hips": {"location": (0, 0, 0.025)}},
            13: {"thigh.L": {"rotation": (-0.48, 0, 0)}, "thigh.R": {"rotation": (0.48, 0, 0)}, "upper_arm.L": {"rotation": (0.30, 0, 0)}, "upper_arm.R": {"rotation": (-0.30, 0, 0)}},
            19: {"hips": {"location": (0, 0, 0.025)}},
            25: {"thigh.L": {"rotation": (0.48, 0, 0)}, "thigh.R": {"rotation": (-0.48, 0, 0)}, "upper_arm.L": {"rotation": (-0.30, 0, 0)}, "upper_arm.R": {"rotation": (0.30, 0, 0)}},
        },
    )
    action(
        "sprint",
        (1, 6, 11, 16, 21),
        {
            1: {"thigh.L": {"rotation": (0.75, 0, 0)}, "thigh.R": {"rotation": (-0.75, 0, 0)}, "upper_arm.L": {"rotation": (-0.55, 0, 0)}, "upper_arm.R": {"rotation": (0.55, 0, 0)}, "chest": {"rotation": (0.14, 0, 0)}},
            6: {"hips": {"location": (0, 0, 0.045)}, "chest": {"rotation": (0.14, 0, 0)}},
            11: {"thigh.L": {"rotation": (-0.75, 0, 0)}, "thigh.R": {"rotation": (0.75, 0, 0)}, "upper_arm.L": {"rotation": (0.55, 0, 0)}, "upper_arm.R": {"rotation": (-0.55, 0, 0)}, "chest": {"rotation": (0.14, 0, 0)}},
            16: {"hips": {"location": (0, 0, 0.045)}, "chest": {"rotation": (0.14, 0, 0)}},
            21: {"thigh.L": {"rotation": (0.75, 0, 0)}, "thigh.R": {"rotation": (-0.75, 0, 0)}, "upper_arm.L": {"rotation": (-0.55, 0, 0)}, "upper_arm.R": {"rotation": (0.55, 0, 0)}, "chest": {"rotation": (0.14, 0, 0)}},
        },
    )
    clear_pose()


def configure_visibility(slots):
    defaults = {
        "Body": "male",
        "Hair": "a",
        "Top": "tshirt",
        "Bottom": "jogger",
        "Shoes": "sneakers",
    }
    for slot_name, slot in slots.items():
        for child in slot.children:
            hidden = child.get("variant") != defaults.get(slot_name)
            for descendant in (child, *child.children_recursive):
                descendant.hide_render = hidden
                descendant.hide_viewport = hidden


def export_glb(root):
    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_vertex_color="MATERIAL",
        export_cameras=False,
        export_lights=False,
    )


def render_preview(root):
    # Render técnico del GLB fuente para control visual; no se incorpora al proyecto.
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = PREVIEW_PNG
    scene.world.color = (0.055, 0.07, 0.11)

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (2.6, -5.8, 2.3)
    target = Vector((0, 0, 1.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 62
    scene.camera = camera

    for name, location, energy, size in (
        ("Key", (-3, -4, 6), 950, 4.0),
        ("Fill", (4, -2, 3), 550, 3.0),
        ("Rim", (1, 4, 5), 800, 2.5),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        bpy.context.collection.objects.link(light)

    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "PreviewFloor"
    floor_material = bpy.data.materials.new("PreviewFloorMaterial")
    floor_material.diffuse_color = (0.10, 0.12, 0.17, 1)
    floor.data.materials.append(floor_material)
    bpy.ops.render.render(write_still=True)


def build():
    reset_scene()
    material = create_vertex_material()
    root = make_empty("Avatar")
    rig = create_armature(root)
    slots = {name: make_empty(name, root) for name in (
        "Body", "Hair", "Top", "Bottom", "Shoes", "HeadAccessory", "FaceAccessory",
        "HandAccessory", "BackAccessory", "WaistAccessory", "ShoulderAccessory", "Details"
    )}

    add_body_variant(slots["Body"], "male", rig, material, feminine=False)
    add_body_variant(slots["Body"], "female", rig, material, feminine=True)
    add_hair_variants(slots["Hair"], rig, material)
    add_top_variants(slots["Top"], rig, material)
    add_bottom_variants(slots["Bottom"], rig, material)
    add_shoe_variants(slots["Shoes"], rig, material)
    add_head_accessories(slots["HeadAccessory"], rig, material)
    add_face_accessories(slots["FaceAccessory"], rig, material)
    add_hand_accessories(slots["HandAccessory"], rig, material)
    add_back_accessories(slots["BackAccessory"], rig, material)
    add_waist_accessories(slots["WaistAccessory"], rig, material)
    add_shoulder_accessories(slots["ShoulderAccessory"], rig, material)
    add_details(slots["Details"], rig, material)
    create_animations(rig)
    export_glb(root)
    configure_visibility(slots)
    render_preview(root)
    print(f"AVATAR_GLB={OUTPUT_GLB}")
    print(f"AVATAR_PREVIEW={PREVIEW_PNG}")


if __name__ == "__main__":
    build()
