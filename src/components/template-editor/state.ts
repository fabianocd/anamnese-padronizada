import { arrayMove } from "@dnd-kit/sortable";
import { isCondutaSection, prepareTemplateForSave } from "@/lib/templates/normalize";
import {
  LIMITS,
  newId,
  type EditableField,
  type EditableSection,
  type EditableTemplate,
} from "@/lib/templates/schema";

export type EditorState = {
  title: string;
  specialtyId: string | null;
  isDefault: boolean;
  sections: EditableSection[];
};

export type EditorAction =
  | { type: "setTitle"; title: string }
  | { type: "setSpecialty"; specialtyId: string | null }
  | { type: "setDefault"; isDefault: boolean }
  | { type: "replaceSections"; sections: EditableSection[] }
  | { type: "addSection"; id: string }
  | { type: "updateSection"; sectionId: string; patch: Partial<Omit<EditableSection, "id" | "fields">> }
  | { type: "removeSection"; sectionId: string }
  | { type: "restoreSection"; section: EditableSection; index: number }
  | { type: "moveSection"; activeId: string; overId: string }
  | { type: "shiftSection"; sectionId: string; delta: -1 | 1 }
  | { type: "addField"; sectionId: string; id: string }
  | { type: "updateField"; sectionId: string; fieldId: string; patch: Partial<Omit<EditableField, "id">> }
  | { type: "removeField"; sectionId: string; fieldId: string }
  | { type: "moveField"; sectionId: string; activeId: string; overId: string };

/** Estado inicial: garante a `#CONDUTA:` no fim (e só uma). */
export function initEditorState(input: {
  title: string;
  specialtyId?: string | null;
  isDefault?: boolean;
  schema: EditableTemplate;
}): EditorState {
  return {
    title: input.title,
    specialtyId: input.specialtyId ?? null,
    isDefault: Boolean(input.specialtyId) && Boolean(input.isDefault),
    sections: prepareTemplateForSave(input.schema).sections,
  };
}

function mapSection(
  sections: EditableSection[],
  sectionId: string,
  update: (section: EditableSection) => EditableSection,
): EditableSection[] {
  return sections.map((section) => (section.id === sectionId ? update(section) : section));
}

/** Índices das seções que podem ser movidas (todas menos a #CONDUTA, fixa no fim). */
function movableCount(sections: EditableSection[]): number {
  return sections.filter((section) => !isCondutaSection(section)).length;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "setTitle":
      return { ...state, title: action.title };

    case "setSpecialty":
      return {
        ...state,
        specialtyId: action.specialtyId,
        isDefault: action.specialtyId ? state.isDefault : false,
      };

    case "setDefault":
      return { ...state, isDefault: Boolean(state.specialtyId) && action.isDefault };

    case "replaceSections":
      return { ...state, sections: action.sections };

    case "addSection": {
      if (state.sections.length >= LIMITS.sections) return state;
      const section: EditableSection = { id: action.id, title: "", fields: [] };
      // Entra antes da #CONDUTA.
      const index = movableCount(state.sections);
      const sections = [...state.sections];
      sections.splice(index, 0, section);
      return { ...state, sections };
    }

    case "updateSection":
      return {
        ...state,
        sections: mapSection(state.sections, action.sectionId, (section) => ({
          ...section,
          ...action.patch,
        })),
      };

    case "removeSection": {
      const target = state.sections.find((section) => section.id === action.sectionId);
      if (!target || isCondutaSection(target)) return state;
      return {
        ...state,
        sections: state.sections.filter((section) => section.id !== action.sectionId),
      };
    }

    case "restoreSection": {
      if (state.sections.some((section) => section.id === action.section.id)) return state;
      const index = Math.min(action.index, movableCount(state.sections));
      const sections = [...state.sections];
      sections.splice(index, 0, action.section);
      return { ...state, sections };
    }

    case "moveSection": {
      const from = state.sections.findIndex((section) => section.id === action.activeId);
      const to = state.sections.findIndex((section) => section.id === action.overId);
      const limit = movableCount(state.sections);
      if (from < 0 || to < 0 || from >= limit || to >= limit || from === to) return state;
      return { ...state, sections: arrayMove(state.sections, from, to) };
    }

    case "shiftSection": {
      const from = state.sections.findIndex((section) => section.id === action.sectionId);
      const to = from + action.delta;
      if (from < 0 || to < 0 || to >= movableCount(state.sections)) return state;
      return { ...state, sections: arrayMove(state.sections, from, to) };
    }

    case "addField":
      return {
        ...state,
        sections: mapSection(state.sections, action.sectionId, (section) =>
          section.fields.length >= LIMITS.fieldsPerSection
            ? section
            : {
                ...section,
                fields: [...section.fields, { id: action.id, label: "", type: "short_text" }],
              },
        ),
      };

    case "updateField":
      return {
        ...state,
        sections: mapSection(state.sections, action.sectionId, (section) => ({
          ...section,
          fields: section.fields.map((field) =>
            field.id === action.fieldId ? { ...field, ...action.patch } : field,
          ),
        })),
      };

    case "removeField":
      return {
        ...state,
        sections: mapSection(state.sections, action.sectionId, (section) => ({
          ...section,
          fields: section.fields.filter((field) => field.id !== action.fieldId),
        })),
      };

    case "moveField":
      return {
        ...state,
        sections: mapSection(state.sections, action.sectionId, (section) => {
          const from = section.fields.findIndex((field) => field.id === action.activeId);
          const to = section.fields.findIndex((field) => field.id === action.overId);
          if (from < 0 || to < 0 || from === to) return section;
          return { ...section, fields: arrayMove(section.fields, from, to) };
        }),
      };
  }
}

export { newId };
