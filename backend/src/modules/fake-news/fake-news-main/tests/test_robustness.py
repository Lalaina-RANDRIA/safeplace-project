import unittest

from llm_client import _try_parse_json
from synthesis import _normalize_confidence
from translation import _looks_like_hallucinated_translation


class TestLLMRobustness(unittest.TestCase):
    def test_try_parse_json_handles_markdown_json(self):
        raw = '```json\n{"status": "Vrai", "confidence": 96, "justification": "ok"}\n```'
        self.assertEqual(
            _try_parse_json(raw),
            {"status": "Vrai", "confidence": 96, "justification": "ok"},
        )

    def test_try_parse_json_handles_text_with_json_prefix_suffix(self):
        raw = 'Voici le JSON : {"status": "Faux", "confidence": 80, "justification": "ok"} merci'
        self.assertEqual(
            _try_parse_json(raw),
            {"status": "Faux", "confidence": 80, "justification": "ok"},
        )

    def test_try_parse_json_returns_none_for_invalid_payload(self):
        self.assertIsNone(_try_parse_json('json invalide'))

    def test_normalize_confidence_accepts_common_formats(self):
        self.assertEqual(_normalize_confidence('60%'), 60)
        self.assertEqual(_normalize_confidence('0.6'), 60)
        self.assertEqual(_normalize_confidence('60'), 60)
        self.assertEqual(_normalize_confidence(' 80 '), 80)
        self.assertEqual(_normalize_confidence('80%'), 80)

    def test_normalize_confidence_rejects_invalid_values(self):
        self.assertIsNone(_normalize_confidence('abc'))

    def test_translation_guard_rejects_hallucinated_translation(self):
        original = "Fiaram-panjakana nifandona tamin’ny moto"
        translated = "Le feu est allumé"
        self.assertTrue(_looks_like_hallucinated_translation(original, translated))


if __name__ == '__main__':
    unittest.main()
